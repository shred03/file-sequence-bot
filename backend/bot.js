import { Telegraf, Markup } from 'telegraf';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import { botMsgResponse } from './script/message.js';

dotenv.config();

const mongoUri = process.env.MONGO_URI;
const botToken = process.env.BOT_TOKEN;
const port = process.env.PORT || 8080;

if (!mongoUri || !botToken) {
    console.error('Error: MONGO_URI and BOT_TOKEN must be set in environment variables');
    process.exit(1);
}

const client = new MongoClient(mongoUri);

let usersCollection;
const userFileSequences = new Map();


const CONFIG = {
    BATCH_SIZE: 50, 
    DELAY_BETWEEN_BATCHES: 100, 
    DELAY_BETWEEN_FILES: 100, 
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, 
    MAX_FILES_PER_USER: 200, 
    PROGRESS_UPDATE_INTERVAL: 50 
};


const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));


async function retryOperation(operation, maxRetries = CONFIG.MAX_RETRIES, delay = CONFIG.RETRY_DELAY) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error.message);
            
            if (attempt === maxRetries) {
                throw error;
            }
            
            // Exponential backoff
            const backoffDelay = delay * Math.pow(2, attempt - 1);
            await sleep(backoffDelay);
        }
    }
}

async function startMessage(ctx) {
    const userId = ctx.message.from.id;
    const username = ctx.message.from.username;
    const name = ctx.message.from.first_name;

    await updateUserInfo(userId, username, name);

    const buttonURL = 'https://t.me/espadaSupport';
    const welcomeText = botMsgResponse.welcomeMsg(name);
    const messageText = welcomeText + botMsgResponse.botDescription + botMsgResponse.additionalInfo;

    await ctx.reply(messageText, Markup.inlineKeyboard([Markup.button.url('Updates!', buttonURL)]));
}

// Enhanced file processing with better error handling
async function processFileSequence(ctx, fileType) {
    const userId = ctx.message.from.id;

    if (!userFileSequences.has(userId)) {
        await ctx.reply('❌ No active sequencing session. Use /ssequence to start one.');
        return;
    }

    const userData = userFileSequences.get(userId);
    const file = ctx.message[fileType];

    if (!file) {
        await ctx.reply('❌ Unsupported file type. Send documents, videos, or audio files.');
        return;
    }

    // Check file limit
    if (userData.files.length >= CONFIG.MAX_FILES_PER_USER) {
        await ctx.reply(`❌ Maximum file limit (${CONFIG.MAX_FILES_PER_USER}) reached. Use /esequence to process current files.`);
        return;
    }

    try {
        // Store file info with metadata
        const fileInfo = {
            message: ctx.message,
            fileType: fileType,
            fileName: file.file_name || `${fileType}_${Date.now()}`,
            fileSize: file.file_size || 0,
            timestamp: new Date()
        };

        userData.files.push(fileInfo);
        userData.lastActivity = new Date();

        // Progress update
        const fileCount = userData.files.length;
        if (fileCount % CONFIG.PROGRESS_UPDATE_INTERVAL === 0 || fileCount <= 5) {
            await ctx.reply(`📁 ${fileCount} files collected and ready for sequencing...`);
        } else {
            // Just acknowledge receipt for other files
            await ctx.react('👍');
        }

    } catch (error) {
        console.error('Error processing file:', error);
        await ctx.reply('⚠️ Error processing file, but continuing to collect others...');
    }
}

// Enhanced batch processing for better reliability
async function processBatch(ctx, batch, batchIndex, totalBatches) {
    console.log(`Processing batch ${batchIndex + 1}/${totalBatches} with ${batch.length} files`);
    
    const results = {
        success: 0,
        failed: 0,
        errors: []
    };

    for (let i = 0; i < batch.length; i++) {
        const fileInfo = batch[i];
        const message = fileInfo.message;
        const file = message.document || message.video || message.audio;

        if (!file) {
            results.failed++;
            continue;
        }

        try {
            await retryOperation(async () => {
                const caption = message.caption || '';
                
                if (message.document) {
                    await ctx.replyWithDocument(file.file_id, { caption });
                } else if (message.video) {
                    await ctx.replyWithVideo(file.file_id, { caption });
                } else if (message.audio) {
                    await ctx.replyWithAudio(file.file_id, { caption });
                }
            });

            results.success++;
            
            // Small delay between files to respect rate limits
            if (i < batch.length - 1) {
                await sleep(CONFIG.DELAY_BETWEEN_FILES);
            }

        } catch (error) {
            console.error(`Failed to send file ${fileInfo.fileName}:`, error);
            results.failed++;
            results.errors.push(`${fileInfo.fileName}: ${error.message}`);
        }
    }

    return results;
}

// Enhanced sequence ending with batch processing
async function endSequence(ctx) {
    const userId = ctx.message.from.id;

    if (!userFileSequences.has(userId)) {
        await ctx.reply('❌ No ongoing file sequencing process. Use /ssequence to begin.');
        return;
    }

    const userData = userFileSequences.get(userId);

    if (userData.files.length === 0) {
        await ctx.reply('❌ No files to sequence. Send some files with /ssequence first.');
        userFileSequences.delete(userId);
        return;
    }

    const totalFiles = userData.files.length;
    await ctx.reply(`🔄 Starting to sequence ${totalFiles} files... This may take a while.`);

    try {
        // Enhanced sorting logic
        userData.files.sort((a, b) => {
            const fileA = a.message.document || a.message.video || a.message.audio;
            const fileB = b.message.document || b.message.video || b.message.audio;

            const nameA = fileA.file_name || '';
            const nameB = fileB.file_name || '';

            return getQualityRank(nameA) - getQualityRank(nameB) ||
                   getEpisodeNumber(nameA) - getEpisodeNumber(nameB) ||
                   nameA.localeCompare(nameB);
        });

        // Process files in batches
        const batches = [];
        for (let i = 0; i < userData.files.length; i += CONFIG.BATCH_SIZE) {
            batches.push(userData.files.slice(i, i + CONFIG.BATCH_SIZE));
        }

        let totalSuccess = 0;
        let totalFailed = 0;
        const allErrors = [];

        // Process each batch
        for (let i = 0; i < batches.length; i++) {
            // Progress update
            if (batches.length > 1) {
                await ctx.reply(`📦 Processing batch ${i + 1}/${batches.length}...`);
            }

            const results = await processBatch(ctx, batches[i], i, batches.length);
            totalSuccess += results.success;
            totalFailed += results.failed;
            allErrors.push(...results.errors);

            // Delay between batches (except for the last one)
            if (i < batches.length - 1) {
                await sleep(CONFIG.DELAY_BETWEEN_BATCHES);
            }
        }

        // Final summary
        let summaryMessage = `✅ Sequencing completed!\n`;
        summaryMessage += `📁 Total files processed: ${totalFiles}\n`;
        summaryMessage += `✅ Successfully sent: ${totalSuccess}\n`;
        
        if (totalFailed > 0) {
            summaryMessage += `❌ Failed: ${totalFailed}\n`;
            if (allErrors.length > 0) {
                summaryMessage += `\n⚠️ Errors encountered:\n`;
                // Show only first 5 errors to avoid message being too long
                const errorsToShow = allErrors.slice(0, 5);
                summaryMessage += errorsToShow.join('\n');
                if (allErrors.length > 5) {
                    summaryMessage += `\n... and ${allErrors.length - 5} more errors`;
                }
            }
        }

        await ctx.reply(summaryMessage);

        // Update user statistics
        try {
            await retryOperation(async () => {
                const userDoc = await usersCollection.findOne({ user_id: userId });
                const totalSequences = (userDoc?.total_sequences || 0) + totalSuccess;
                await usersCollection.updateOne(
                    { user_id: userId },
                    { 
                        $set: { 
                            total_sequences: totalSequences,
                            last_sequence_date: new Date(),
                            last_sequence_count: totalSuccess
                        } 
                    }
                );
            });
        } catch (error) {
            console.error('Error updating user statistics:', error);
        }

    } catch (error) {
        console.error('Error during sequencing process:', error);
        await ctx.reply('❌ An error occurred during the sequencing process. Some files may not have been sent.');
    } finally {
        // Always clean up
        userFileSequences.delete(userId);
    }
}

// Helper functions for sorting
function getQualityRank(name = '') {
    const qualityOrder = { '480p': 0, '540p': 1, '720p': 2, '1080p': 3, '2160p': 4, '4K': 5 };
    const match = name.match(/(480p|540p|720p|1080p|2160p|4K)/);
    return match ? qualityOrder[match[1]] : 99;
}

function getEpisodeNumber(name = '') {
    const match = name.match(/(?:E|Ep|Episode|Part)?\s*(\d{1,3})/i);
    return match ? parseInt(match[1]) : 9999;
}

async function updateUserInfo(userId, username, name) {
    try {
        await retryOperation(async () => {
            await usersCollection.updateOne(
                { user_id: userId },
                {
                    $set: { username: username, name: name, last_active: new Date() },
                    $setOnInsert: { createdAt: new Date() }
                },
                { upsert: true }
            );
        });
    } catch (error) {
        console.error('Error updating user info:', error);
    }
}

// Clean up inactive sessions periodically
function cleanupInactiveSessions() {
    const now = new Date();
    const TIMEOUT = 30 * 60 * 1000; // 30 minutes

    for (const [userId, userData] of userFileSequences.entries()) {
        if (now - userData.lastActivity > TIMEOUT) {
            console.log(`Cleaning up inactive session for user ${userId}`);
            userFileSequences.delete(userId);
        }
    }
}

async function initializeBot() {
    try {
        await client.connect();
        console.log('✅ Connected to MongoDB');

        const db = client.db('seq');
        usersCollection = db.collection('users');

        const bot = new Telegraf(botToken);

        // Command handlers
        bot.start(startMessage);

        bot.command('ssequence', async (ctx) => {
            const userId = ctx.message.from.id;

            if (userFileSequences.has(userId)) {
                const userData = userFileSequences.get(userId);
                await ctx.reply(`⚠️ You already have an active sequencing session with ${userData.files.length} files.\nUse /esequence to finish it or /cancel to cancel it.`);
                return;
            }

            userFileSequences.set(userId, { 
                files: [], 
                startTime: new Date(),
                lastActivity: new Date()
            });
            
            await ctx.reply(
                `🚀 File sequencing process started!\n\n` +
                `📁 Send up to ${CONFIG.MAX_FILES_PER_USER} files for sequencing\n` +
                `⚡ Files will be processed in batches for better reliability\n` +
                `🏁 Use /esequence when done to receive sequenced files\n` +
                `❌ Use /cancel to abort the process`
            );
        });

        // Enhanced status command
        bot.command('status', async (ctx) => {
            const userId = ctx.message.from.id;
            
            if (userFileSequences.has(userId)) {
                const userData = userFileSequences.get(userId);
                const fileCount = userData.files.length;
                const startTime = userData.startTime;
                const duration = Math.round((new Date() - startTime) / 1000);
                
                await ctx.reply(
                    `📊 Session Status:\n` +
                    `📁 Files collected: ${fileCount}/${CONFIG.MAX_FILES_PER_USER}\n` +
                    `⏱️ Session duration: ${duration}s\n` +
                    `🏁 Use /esequence to process files`
                );
            } else {
                await ctx.reply('❌ No active sequencing session. Use /ssequence to start one.');
            }
        });

        bot.on('document', (ctx) => processFileSequence(ctx, 'document'));
        bot.on('video', (ctx) => processFileSequence(ctx, 'video'));
        bot.on('audio', (ctx) => processFileSequence(ctx, 'audio'));

        bot.command('esequence', endSequence);

        bot.command('cancel', async (ctx) => {
            const userId = ctx.message.from.id;

            if (userFileSequences.has(userId)) {
                const userData = userFileSequences.get(userId);
                const fileCount = userData.files.length;
                userFileSequences.delete(userId);
                await ctx.reply(`❌ File sequencing process canceled.\n📁 ${fileCount} files were discarded.\nUse /ssequence to start a new session.`);
            } else {
                await ctx.reply('❌ No active sequencing session found. Use /ssequence to begin.');
            }
        });

        // Set up periodic cleanup
        setInterval(cleanupInactiveSessions, 10 * 60 * 1000); // Every 10 minutes

        await bot.launch({
            port: port,
        });

        console.log(`🚀 Bot is running on port ${port}`);
        console.log(`📊 Configuration: Batch size: ${CONFIG.BATCH_SIZE}, Max files: ${CONFIG.MAX_FILES_PER_USER}`);

        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));

    } catch (error) {
        console.error('❌ Error starting bot:', error);
        process.exit(1);
    }
}

initializeBot();