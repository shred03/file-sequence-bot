import { Telegraf, Markup } from 'telegraf';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

// Load environment variables
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

// Start message
async function startMessage(ctx) {
    const userId = ctx.message.from.id;
    const username = ctx.message.from.username;
    const name = ctx.message.from.first_name;

    await updateUserInfo(userId, username, name);

    const buttonURL = 'https://t.me/espadaSupport';

    const welcomeText = `Welcome, ${name}! 🌟 I am a file sequencing bot. Built with ❤️ using JavaScript and the Telegraf library.\n\n`;
    const botDescription = `🤖 What I do:\nI help you sequence and organize your files. Use /ssequence to start the process. Send documents, videos, or audio files, and when you're done, use /esequence to get the sequenced files. Use /cancel to cancel all sequences.\n\n`;
    const additionalInfo = `🔗 Owner: @sluury`;

    const messageText = welcomeText + botDescription + additionalInfo;

    await ctx.reply(messageText, Markup.inlineKeyboard([Markup.button.url('Updates!', buttonURL)]));
}

// Function for processing files
async function processFileSequence(ctx, fileType) {
    const userId = ctx.message.from.id;

    if (userFileSequences.has(userId)) {
        const userData = userFileSequences.get(userId);
        const file = ctx.message[fileType];

        if (file) {
            userData.files.push(ctx.message);
            await ctx.reply('File received and added to the sequencing process.');
        } else {
            await ctx.reply('Unsupported file type. Send documents, videos, or audio files.');
        }
    }
}

// End sequence to get files
async function endSequence(ctx) {
    const userId = ctx.message.from.id;

    if (userFileSequences.has(userId)) {
        const userData = userFileSequences.get(userId);

        if (userData.files.length > 0) {
            // Sort files by filename
            userData.files.sort((a, b) => {
                const fileA = a.document || a.video || a.audio;
                const fileB = b.document || b.video || b.audio;
                return fileA.file_name?.localeCompare(fileB.file_name) || 0;
            });

            // Send sequenced files
            for (const fileMessage of userData.files) {
                const file = fileMessage.document || fileMessage.video || fileMessage.audio;

                if (file) {
                    const caption = fileMessage.caption || '';

                    try {
                        if (fileMessage.document) {
                            await ctx.replyWithDocument(file.file_id, { caption });
                        } else if (fileMessage.video) {
                            await ctx.replyWithVideo(file.file_id, { caption });
                        } else if (fileMessage.audio) {
                            await ctx.replyWithAudio(file.file_id, { caption });
                        }
                    } catch (error) {
                        console.error('Error sending file:', error);
                        await ctx.reply('Error sending one of the files. Continuing with the rest...');
                    }
                }
            }

            await ctx.reply(`File sequencing completed. You have received ${userData.files.length} sequenced files.`);

            // Update user statistics
            try {
                const userDoc = await usersCollection.findOne({ user_id: userId });
                const totalSequences = userDoc?.total_sequences || 0;
                await usersCollection.updateOne(
                    { user_id: userId }, 
                    { $set: { total_sequences: totalSequences + userData.files.length } }
                );
            } catch (error) {
                console.error('Error updating user statistics:', error);
            }

        } else {
            await ctx.reply('No files to sequence. Send some files with /ssequence first.');
        }

        userFileSequences.delete(userId);

    } else {
        await ctx.reply('No ongoing file sequencing process. Use /ssequence to begin.');
    }
}

async function updateUserInfo(userId, username, name) {
    try {
        await usersCollection.updateOne(
            { user_id: userId },
            { $set: { username: username, name: name, last_active: new Date() } },
            { upsert: true }
        );
    } catch (error) {
        console.error('Error updating user info:', error);
    }
}

// Bot stats
async function showStats(ctx) {
    try {
        const totalUsers = await usersCollection.countDocuments();
        const totalSequencesResult = await usersCollection.aggregate([
            { $group: { _id: null, total: { $sum: '$total_sequences' } } }
        ]).toArray();
        
        const totalSequences = totalSequencesResult[0]?.total || 0;

        await ctx.reply(`📊 Bot Statistics:\n👥 Total Users: ${totalUsers}\n📁 Total File Sequences: ${totalSequences}`);
    } catch (error) {
        console.error('Error fetching stats:', error);
        await ctx.reply('Error fetching statistics. Please try again later.');
    }
}

// Initialize bot
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
                await ctx.reply('You are currently in a file sequencing process. Use /esequence to finish it or /cancel to cancel it.');
                return;
            }

            userFileSequences.set(userId, { files: [] });
            await ctx.reply('✅ You have started a file sequencing process. Send the files you want to sequence one by one.\n' +
                'When you are done, use /esequence to finish and get the sequenced files.');
        });

        // File handlers
        bot.on('document', (ctx) => processFileSequence(ctx, 'document'));
        bot.on('video', (ctx) => processFileSequence(ctx, 'video'));
        bot.on('audio', (ctx) => processFileSequence(ctx, 'audio'));

        bot.command('esequence', endSequence);
        bot.command('stats', showStats);

        // Cancel sequence
        bot.command('cancel', async (ctx) => {
            const userId = ctx.message.from.id;

            if (userFileSequences.has(userId)) {
                userFileSequences.delete(userId);
                await ctx.reply('❌ File sequencing process canceled. Use /ssequence to start a new one.');
            } else {
                await ctx.reply('No ongoing file sequencing process to cancel. Use /ssequence to begin.');
            }
        });

        // Help command
        bot.command('help', async (ctx) => {
            const helpText = `
🤖 **File Sequencing Bot Help**

**Commands:**
/start - Start the bot and see welcome message
/ssequence - Begin a new file sequencing process
/esequence - End sequencing and receive sorted files
/cancel - Cancel current sequencing process
/stats - View bot statistics
/help - Show this help message

**How to use:**
1. Use /ssequence to start
2. Send your files (documents, videos, audio)
3. Use /esequence to get them back sorted alphabetically
4. Use /cancel if you want to stop without getting files

**Owner:** @sluury
            `;
            await ctx.reply(helpText);
        });

        // Error handling
        bot.catch((err, ctx) => {
            console.error(`Error for ${ctx.updateType}:`, err);
            ctx.reply('An error occurred. Please try again later.');
        });

        // Launch bot
        await bot.launch({
            port: port,
        });

        console.log(`🚀 Bot is running on port ${port}`);

        // Graceful shutdown
        process.once('SIGINT', () => bot.stop('SIGINT'));
        process.once('SIGTERM', () => bot.stop('SIGTERM'));

    } catch (error) {
        console.error('❌ Error starting bot:', error);
        process.exit(1);
    }
}

// Start the bot
initializeBot();