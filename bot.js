require('dotenv').config();
const { ethers } = require('ethers');
const fs = require('fs');

// Contract ABI, limited to buyToken and sellToken functions
const CONTRACT_ABI = [
    "function buyToken(address token, uint256 slippageTolerance, uint256 expiration, uint256 amountOutMinimum) external payable returns (uint256)",
    "function sellToken(address token, uint256 amountIn, uint256 slippageTolerance, uint256 expiration, uint256 amountOutMinimum) external returns (uint256)"
];


// Load environment variables
const { PRIVATE_KEY, POLYGON_RPC_URL, CONTRACT_ADDRESS } = process.env;
const provider = new ethers.providers.JsonRpcProvider(POLYGON_RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, wallet);

console.log({ PRIVATE_KEY, POLYGON_RPC_URL, CONTRACT_ADDRESS });

// Helper function to execute buy or sell
async function executeTransaction(tx) {
    try {
        // Fetch dynamic gas fee data
        const feeData = await provider.getFeeData();

        if (tx.type === 'buy') {
            const txResponse = await contract.buyToken(
                tx.token,
                tx.slippageTolerance,
                tx.expiration,
                tx.amountOutMinimum,
                {
                    value: ethers.utils.parseEther(tx.amountInMATIC),
                    gasPrice: feeData.gasPrice, // Use dynamic gas price
                }
            );

            console.log("Sent buyToken transaction");
            const receipt = await txResponse.wait();
            console.log(`Buy Transaction Hash: ${receipt.transactionHash}`);
        } else if (tx.type === 'sell') {
            const txResponse = await contract.sellToken(
                tx.token,
                ethers.utils.parseUnits(tx.amountInToken, tx.decimals),
                tx.slippageTolerance,
                tx.expiration,
                tx.amountOutMinimum,
                {
                    gasPrice: feeData.gasPrice, // Use dynamic gas price
                }
            );
            const receipt = await txResponse.wait();
            console.log(`Sell Transaction Hash: ${receipt.transactionHash}`);
        }
    } catch (error) {
        console.error("Error executing transaction:", error);
    }
}

// Main function to read JSON and execute transactions
async function processTransactions() {
    const data = fs.readFileSync('transactions.json', 'utf-8');
    const transactions = JSON.parse(data);

    for (const tx of transactions) {
        await executeTransaction(tx);
    }
}

// Run the bot
processTransactions().catch(console.error);
