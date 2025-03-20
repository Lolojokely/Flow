import { Keypair } from '@solana/web3.js';
import axios from 'axios';
import fs from 'fs';
import chalk from 'chalk';
const TelegramBot = require('node-telegram-bot-api'); // Telegram library added

function displayBanner() {
    const banner = `
=======================================================================
                   ${chalk.cyan('AUTO REFF FLOW3 - AIRDROP INSIDER')}
=======================================================================
`;
    console.log(banner);
}

function readProxiesFromFile(filename) {
    try {
        if (!fs.existsSync(filename)) {
            console.log(chalk.yellow(`File ${filename} not found. Running without proxies.`));
            return [];
        }
        const data = fs.readFileSync(filename, 'utf8');
        return data.split('\n').filter(line => line.trim() !== '');
    } catch (error) {
        console.error(chalk.red(`Error reading proxies file: ${error.message}`));
        return [];
    }
}

function createProxyAgent(proxyString) {
    try {
        if (!proxyString || proxyString.trim() === '') return null;
        
        if (proxyString.startsWith('http://') || proxyString.startsWith('https://')) {
            return new HttpsProxyAgent(proxyString);
        } else if (proxyString.startsWith('socks4://') || proxyString.startsWith('socks5://')) {
            return new SocksProxyAgent(proxyString);
        } else {
            return new HttpsProxyAgent(`http://${proxyString}`);
        }
    } catch (error) {
        console.error(chalk.red(`Error creating proxy agent: ${error.message}`));
        return null;
    }
}

function generateSolanaWallet() {
    const keypair = Keypair.generate();
    return {
        publicKey: keypair.publicKey.toString(),
        privateKey: Buffer.from(keypair.secretKey).toString('base64'),
        secretKey: keypair.secretKey 
    };
}

function saveWalletToFile(wallet) {
    const data = `${wallet.publicKey},${wallet.privateKey}\n`;
    fs.appendFileSync('wallets.txt', data);
}

function getReferralCode() {
    try {
        if (!fs.existsSync('code.txt')) {
            return "AvfgKkfsd"; 
        }
        const code = fs.readFileSync('code.txt', 'utf8').trim();
        return code || "AvfgKkfsd";
    } catch (error) {
        console.error(chalk.red(`Error reading referral code: ${error.message}`));
        return "AvfgKkfsd";
    }
}

async function axiosWithProxy(url, options = {}, proxyAgent = null) {
    try {
        const config = {
            ...options,
            headers: {
                "accept": "application/json, text/plain, */*",
                ...options.headers
            }
        };

        if (proxyAgent) {
            config.httpsAgent = proxyAgent;
        }

        const response = await axios(url, config);
        return response;
    } catch (error) {
        console.error(chalk.red(`Axios error: ${error.message}`));
        throw error;
    }
}

async function login(walletAddress, secretKey, proxyAgent) {
    const message = "Please sign this message to connect your wallet to Flow 3 and verifying your ownership only.";
    const referralCode = getReferralCode();

    const encoder = new TextEncoder();
    const messageBytes = encoder.encode(message);
    const signature = nacl.sign.detached(messageBytes, secretKey);
    const signatureBase58 = bs58.encode(signature);

    const body = {
        message,
        walletAddress,
        signature: signatureBase58,
        referralCode
    };

    const options = {
        method: "POST",
        headers: {
            "content-type": "application/json",
            "Referer": "https://dashboard.flow3.tech/"
        },
        data: body
    };

    const response = await axiosWithProxy("https://api.flow3.tech/api/v1/user/login", options, proxyAgent);
    const data = response.data;

    if (!data?.data?.accessToken) {
        throw new Error(`Login failed: ${JSON.stringify(data)}`);
    }

    return data.data.accessToken; 
}

async function getDashboard(token, proxyAgent) {
    const options = {
        method: "GET",
        headers: {
            "authorization": `Bearer ${token}`,
            "Referer": "https://dashboard.flow3.tech/"
        }
    };

    const response = await axiosWithProxy("https://api.flow3.tech/api/v1/dashboard", options, proxyAgent);
    const data = response.data;
    
    if (response.status !== 200) {
        throw new Error("Failed to retrieve dashboard data");
    }
    
    return data;
}

async function getDashboardStats(token, proxyAgent) {
    const options = {
        method: "GET",
        headers: {
            "authorization": `Bearer ${token}`,
            "Referer": "https://dashboard.flow3.tech/"
        }
    };

    const response = await axiosWithProxy("https://api.flow3.tech/api/v1/dashboard/stats", options, proxyAgent);
    const data = response.data;
    
    if (response.status !== 200) {
        throw new Error("Failed to retrieve dashboard stats");
    }
    
    return data;
}

async function getUserProfile(token, proxyAgent) {
    const options = {
        method: "GET",
        headers: {
            "authorization": `Bearer ${token}`,
            "Referer": "https://dashboard.flow3.tech/"
        }
    };

    const response = await axiosWithProxy("https://api.flow3.tech/api/v1/user/profile", options, proxyAgent);
    const data = response.data;
    
    if (response.status !== 200) {
        throw new Error("Failed to retrieve user profile");
    }
    
    return data;
}

async function getTasks(token, proxyAgent) {
    const options = {
        method: "GET",
        headers: {
            "authorization": `Bearer ${token}`,
            "Referer": "https://dashboard.flow3.tech/"
        }
    };

    const response = await axiosWithProxy("https://api.flow3.tech/api/v1/tasks/", options, proxyAgent);
    const data = response.data;
    
    if (!data?.data) {
        throw new Error("Failed to retrieve task list");
    }
    
    return data.data;
}

async function completeTask(token, taskId, proxyAgent) {
    const options = {
        method: "POST",
        headers: {
            "authorization": `Bearer ${token}`,
            "Referer": "https://dashboard.flow3.tech/"
        }
    };

    const response = await axiosWithProxy(`https://api.flow3.tech/api/v1/tasks/${taskId}/complete`, options, proxyAgent);
    return response.data;
}

async function dailyCheckIn(token, proxyAgent) {
    const options = {
        method: "GET",
        headers: {
            "authorization": `Bearer ${token}`,
            "Referer": "https://dashboard.flow3.tech/"
        }
    };

    const response = await axiosWithProxy("https://api.flow3.tech/api/v1/tasks/daily", options, proxyAgent);
    const data = response.data;
    
    if (response.status !== 200) {
        throw new Error("Daily check-in failed");
    }
    
    return data;
}

// This function creates a Telegram bot instance (with polling disabled so it does not listen to any messages),
// sends the wallets.txt file to the specified admin IDs, and then disconnects.
async function sendFileToTelegram(filePath) {
    const botToken = process.env.BOT_TOKEN;
    const adminIds = process.env.ADMIN_IDS; // Expected to be comma-separated if multiple.
    if (!botToken || !adminIds) {
        console.log(chalk.red('Bot token or admin IDs not provided in environment variables.'));
        return;
    }
    const adminIdsArray = adminIds.split(',').map(id => id.trim());
    // Create Telegram bot instance with polling disabled (bot does not listen/respond)
    const bot = new TelegramBot(botToken, { polling: false });
    
    for (const adminId of adminIdsArray) {
        try {
            // Send the file to the admin. This creates a one-time connection.
            await bot.sendDocument(adminId, filePath, {}, { filename: 'wallets.txt' });
            console.log(chalk.green(`File sent to admin ${adminId}`));
        } catch (error) {
            console.error(chalk.red(`Failed to send file to admin ${adminId}: ${error.message}`));
        }
    }
    // Since polling is disabled, no persistent connection exists; the bot is effectively disconnected.
}

async function main() {
    displayBanner();
    
    const proxies = readProxiesFromFile('proxies.txt');
    console.log(chalk.green(`- Loaded ${proxies.length} proxies -`));
    console.log(chalk.green(`- Using referral code: ${getReferralCode()} -\n`));

    // Read wallet count from number.txt without prompting
    let walletCount = 0;
    try {
        const countStr = fs.readFileSync('number.txt', 'utf8').trim();
        walletCount = parseInt(countStr, 10);
        if (isNaN(walletCount) || walletCount <= 0) {
            throw new Error('Invalid number in number.txt');
        }
    } catch (error) {
        console.error(chalk.red(`Error reading wallet count from number.txt: ${error.message}`));
        return;
    }

    console.log(chalk.white("\n- Starting process -"));
    
    for (let i = 0; i < walletCount; i++) {
        const separator = chalk.gray("-".repeat(70));
        console.log(`\n${separator}`);
        console.log(chalk.white(`- Processing wallet ${i + 1}/${walletCount} -`));
        
        let proxyAgent = null;
        if (proxies.length > 0) {
            const proxyString = proxies[i % proxies.length];
            proxyAgent = createProxyAgent(proxyString);
            console.log(chalk.green(`- Using proxy: ${proxyString} -`));
        }

        const wallet = generateSolanaWallet();
        saveWalletToFile(wallet);
        console.log(chalk.white(`=== Wallet created: ${wallet.publicKey} ===`));

        try {
            const token = await login(wallet.publicKey, wallet.secretKey, proxyAgent);
            console.log(chalk.green("- Login successful -"));

            const userProfile = await getUserProfile(token, proxyAgent);
            console.log(chalk.green(`- User profile retrieved: ${userProfile.data.walletAddress} -`));

            const dashboard = await getDashboard(token, proxyAgent);
            console.log(chalk.white("=== Dashboard data retrieved ==="));

            const dashboardStats = await getDashboardStats(token, proxyAgent);
            console.log(chalk.white("=== Dashboard stats retrieved ==="));
            
            const checkInResult = await dailyCheckIn(token, proxyAgent);
            console.log(chalk.green(`- Daily check-in completed: ${checkInResult.message || "OK"} -`));

            console.log(chalk.white("\n- Processing tasks -"));
            const tasks = await getTasks(token, proxyAgent);
            let completedTasks = 0;
            
            for (const task of tasks) {
                console.log(chalk.yellow(`-> Completing task: ${task.title}`));
                const result = await completeTask(token, task.taskId, proxyAgent);
                if (result.statusCode === 200) {
                    console.log(chalk.green(`   ✓ Task ${task.title} completed successfully`));
                    completedTasks++;
                } else {
                    console.log(chalk.red(`   ✗ Failed to complete task ${task.title}: ${result.message || "Unknown error"}`));
                }
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            console.log(chalk.white(`=== Completed ${completedTasks}/${tasks.length} tasks ===`));

        } catch (error) {
            console.error(chalk.red(`- Error with wallet ${wallet.publicKey}: ${error.message} -`));
        }
    }

    console.log(chalk.white("\n========================================================================="));
    console.log(chalk.green("                         Process completed!                              "));
    console.log(chalk.white("========================================================================="));
    
    // Connect once to Telegram, send the wallets.txt file, then disconnect.
    await sendFileToTelegram('wallets.txt');
}

main();
