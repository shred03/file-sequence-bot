# 🤖 Telegram File Sequencing Bot

A powerful Telegram bot that helps you organize and sequence your files alphabetically. Built with modern Node.js, MongoDB, and the Telegraf library.

![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-green.svg)
![Telegraf](https://img.shields.io/badge/Telegraf-4.16+-blue.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

## ✨ Features

- 📁 **File Sequencing**: Automatically sort your files alphabetically by filename
- 🎬 **Multi-Format Support**: Handles documents, videos, and audio files
- 📊 **Statistics Tracking**: Monitor bot usage and file processing statistics
- 🔄 **Session Management**: Start, pause, and cancel file sequencing sessions
- 📱 **User-Friendly Interface**: Simple commands with inline keyboards
- 🛡️ **Production Ready**: Built with modern Node.js practices and error handling
- 🚀 **VPS Deployment**: Complete deployment guide for production use

## 🎯 How It Works

1. **Start Sequencing**: Use `/ssequence` to begin a new file organization session
2. **Upload Files**: Send your documents, videos, or audio files one by one
3. **Get Organized Files**: Use `/esequence` to receive your files sorted alphabetically
4. **Cancel Anytime**: Use `/cancel` to abort the current session

## 🛠️ Installation

### Prerequisites

- Node.js 18.0.0 or higher
- MongoDB (local installation or MongoDB Atlas)
- Telegram Bot Token from [@BotFather](https://t.me/botfather)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/telegram-file-sequencing-bot.git
   cd telegram-file-sequencing-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**
   ```env
   BOT_TOKEN=your_telegram_bot_token_here
   MONGO_URI=your_mongodb_connection_string_here
   PORT=8080
   ```

5. **Start the bot**
   ```bash
   # Development mode (with auto-restart)
   npm run dev
   
   # Production mode
   npm start
   ```

## 🚀 VPS Deployment

For production deployment on a VPS, we provide a complete automated setup:

### Quick Deployment

1. **Upload deployment script to your VPS**
   ```bash
   scp deployment-script.sh user@your-vps-ip:/home/user/
   ```

2. **Run the automated deployment**
   ```bash
   ssh user@your-vps-ip
   chmod +x deployment-script.sh
   ./deployment-script.sh
   ```

3. **Upload bot files**
   ```bash
   scp bot.js package.json user@your-vps-ip:/opt/telegram-bot/
   ```

The deployment script automatically:
- ✅ Installs Node.js 20.x
- ✅ Sets up MongoDB (optional)
- ✅ Configures PM2 process manager
- ✅ Sets up automatic backups
- ✅ Configures firewall
- ✅ Creates log rotation
- ✅ Sets up Nginx (optional)

### Manual Deployment

For detailed manual deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

## 📱 Bot Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome message and bot introduction |
| `/ssequence` | Start a new file sequencing session |
| `/esequence` | End current session and receive sorted files |
| `/cancel` | Cancel current file sequencing session |
| `/stats` | View bot usage statistics |
| `/help` | Show help message with all commands |

## 🏗️ Project Structure

```
telegram-file-sequencing-bot/
├── bot.js                    # Main bot application
├── package.json              # Dependencies and scripts
├── .env                      # Environment variables
├── .env.example              # Environment template
├── ecosystem.config.js       # PM2 configuration
├── deployment-script.sh      # Automated deployment script
├── backup-mongo.sh          # MongoDB backup script
├── nginx.conf               # Nginx configuration
├── README.md                # This file
└── DEPLOYMENT.md            # Detailed deployment guide
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `BOT_TOKEN` | Telegram Bot API token | ✅ Yes | - |
| `MONGO_URI` | MongoDB connection string | ✅ Yes | - |
| `PORT` | Server port | ❌ No | 8080 |

### MongoDB Setup

#### Local MongoDB
```bash
# Install MongoDB
sudo apt install mongodb

# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Connection string
MONGO_URI=mongodb://localhost:27017/seq
```

#### MongoDB Atlas (Recommended)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string
4. Use in your `.env` file

## 📊 Monitoring & Maintenance

### PM2 Commands (Production)
```bash
pm2 status                 # Check bot status
pm2 logs telegram-bot      # View logs
pm2 restart telegram-bot   # Restart bot
pm2 stop telegram-bot      # Stop bot
pm2 delete telegram-bot    # Remove from PM2
```

### Log Files
- Application logs: `/var/log/telegram-bot/`
- PM2 logs: `~/.pm2/logs/`
- System logs: `/var/log/`

### Backup & Restore
```bash
# Manual backup
./backup-mongo.sh

# Restore from backup
mongorestore --db seq /path/to/backup/
```

## 🔒 Security Features

- ✅ Environment variable protection for sensitive data
- ✅ Input validation and sanitization
- ✅ Error handling and graceful degradation
- ✅ Rate limiting and user session management
- ✅ Secure MongoDB authentication
- ✅ Firewall configuration
- ✅ SSL/HTTPS support

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use ES6+ features and modern JavaScript
- Follow existing code style and formatting
- Add comments for complex logic
- Test your changes thoroughly
- Update documentation if needed

## 🐛 Troubleshooting

### Common Issues

**Bot not responding**
```bash
# Check if bot is running
pm2 status

# Check logs for errors
pm2 logs telegram-bot

# Restart if needed
pm2 restart telegram-bot
```

**MongoDB connection failed**
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check connection string in .env
cat .env

# Test connection
mongosh "your_connection_string"
```

**Port already in use**
```bash
# Find process using port
sudo netstat -tulpn | grep :8080

# Kill process or change port in .env
```

**Permission denied**
```bash
# Fix file permissions
sudo chown -R $USER:$USER /opt/telegram-bot
chmod +x deployment-script.sh
```

## 📈 Performance

### Recommended VPS Specifications

| Users | RAM | CPU | Storage | Bandwidth |
|-------|-----|-----|---------|-----------|
| <1K   | 1GB | 1 Core | 20GB | 1TB |
| 1K-10K | 2GB | 2 Cores | 40GB | 2TB |
| 10K+ | 4GB+ | 4+ Cores | 80GB+ | 5TB+ |

### Optimization Tips

- Use MongoDB Atlas for better performance and reliability
- Enable Nginx caching for static content
- Monitor memory usage with PM2
- Regular database cleanup and indexing
- Use CDN for file distribution (if applicable)

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**@sluury**
- Telegram: [@sluury](https://t.me/sluury)
- GitHub: [Your GitHub Profile](https://github.com/yourusername)

## 🙏 Acknowledgments

- [Telegraf.js](https://telegraf.js.org/) - Modern Telegram Bot API framework
- [MongoDB](https://www.mongodb.com/) - Database solution
- [PM2](https://pm2.keymetrics.io/) - Production process manager
- [Node.js](https://nodejs.org/) - JavaScript runtime

## 📞 Support

If you encounter any issues or have questions:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Look at [existing issues](https://github.com/yourusername/telegram-file-sequencing-bot/issues)
3. Create a [new issue](https://github.com/yourusername/telegram-file-sequencing-bot/issues/new) if needed
4. Contact [@sluury](https://t.me/sluury) on Telegram

---

⭐ **If you find this project helpful, please give it a star!** ⭐

Made with ❤️ by [@sluury](https://t.me/sluury)