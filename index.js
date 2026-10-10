// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const { GoogleSpreadsheet } = require('google-spreadsheet');
// const { JWT } = require('google-auth-library');

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleSpreadsheet } from 'google-spreadsheet';
import { JWT } from 'google-auth-library';

const app = express();
app.use(cors());
app.use(express.json());


const corsOptions = {
  origin: 'http://localhost:5173',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());


const privateKey = process.env.GOOGLE_PRIVATE_KEY 
  ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') 
  : undefined;

const serviceAccountAuth = new JWT({
  email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  key: privateKey,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, serviceAccountAuth);

app.get('/test-connection', async (req, res) => {
  try {
    await doc.loadInfo(); 
    res.json({ 
      message: "Successfully connected to Google Sheets!", 
      documentTitle: doc.title,
      sheetCount: doc.sheetCount
    });
  } catch (error) {
    console.error("Connection error:", error);
    res.status(500).json({ error: "Failed to connect to Google Sheets" });
  }
});


// GET all credit cards
app.get('/cards', async (req, res) => {
  try {
    console.log("🔍 Fetching cards: Loading spreadsheet info...");
    await doc.loadInfo(); 
    
    // Log available sheet names to the server terminal to help you debug naming errors!
    const availableTabs = Object.keys(doc.sheetsByTitle);
    console.log("📋 Available tabs found in your Google Sheet:", availableTabs);

    // FIX: Look for 'Credit_Cards'. If not found, look for 'Credit Cards' (with a space)
    let sheet = doc.sheetsByTitle['Credit_Cards'] || doc.sheetsByTitle['Credit Cards'];
    
    if (!sheet) {
      // If still not found, automatically fall back to the very first tab in the spreadsheet
      console.warn("⚠️ 'Credit_Cards' tab not found. Falling back to the first available tab.");
      sheet = doc.sheetsByIndex[0];
    }

    if (!sheet) {
      throw new Error(`No tabs could be located in the spreadsheet. Found: ${availableTabs.join(', ')}`);
    }

    console.log(`📖 Reading rows from sheet tab: "${sheet.title}"`);
    const rows = await sheet.getRows();
    
    // Safely map rows to objects, filtering out empty or corrupt rows
    const cards = rows
      .map(row => {
        try {
          return typeof row.toObject === 'function' ? row.toObject() : null;
        } catch (e) {
          return null;
        }
      })
      .filter(card => card !== null && card.Card_ID); // Ensure it has a Card_ID
    
    console.log(`✅ Successfully loaded ${cards.length} card configurations.`);
    res.json(cards);
  } catch (error) {
    console.error("💥 Severe error fetching cards details:", error);
    res.status(500).json({ 
      error: "Failed to fetch credit cards from Google Sheets", 
      details: error.message 
    });
  }
});


// POST a new transaction
app.post('/transactions', async (req, res) => {
  try {

    await doc.loadInfo();
    // 1. Save the main transaction to your Transactions tab
    const txnSheet = doc.sheetsByTitle['Transactions']; 
    const newTxnId = `TXN-${Date.now()}`;
    
    await txnSheet.addRow({
      Txn_ID: newTxnId,
      Card_ID: req.body.Card_ID,
      Date: req.body.Date,
      Description: req.body.Description,
      Amount: req.body.Amount,
      Type: req.body.Type,
      Category: req.body.Category
    });

    if (req.body.splits && req.body.splits.length > 0) {
      const splitSheet = doc.sheetsByTitle['Shared_Expenses'];
      
      if (!splitSheet) {
        console.error("ERROR: Shared_Expenses tab not found in Google Sheets!");
      } else {
        // Loop through each friend and add a row for them
        for (const split of req.body.splits) {
          await splitSheet.addRow({
            Split_ID: `SPLIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            Txn_ID: newTxnId, // Links it to the main transaction!
            Date: req.body.Date,
            Friend_Name: split.friend,
            Amount_Owed: split.amountOwed,
            Description: req.body.Description,
            Status: 'Pending'
          });
        }
      }
    }

    res.json({ success: true, Txn_ID: newTxnId });
  } catch (error) {
    console.error("Transaction save error:", error);
    res.status(500).json({ error: error.message });
  }
});

// GET transactions for a specific card
app.get('/transactions/:cardId', async (req, res) => {
  try {
    const { cardId } = req.params;
    
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Transactions'];
    const rows = await sheet.getRows();
    
    // Filter rows where the Card_ID matches the URL parameter
    const transactions = rows
      .map(row => row.toObject())
      .filter(txn => txn.Card_ID === cardId);
      
    res.json(transactions);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});


// 1. Fetch all EMIs
app.get('/emis', async (req, res) => {
  try {
    const sheet = doc.sheetsByTitle['EMIs'];
    const rows = await sheet.getRows();
    const emis = rows.map(row => ({
      EMI_ID: row.get('EMI_ID'),
      Product_Name: row.get('Product_Name'),
      Total_Amount: parseFloat(row.get('Total_Amount')) || 0,
      Down_Payment: parseFloat(row.get('Down_Payment')) || 0,
      Duration_Months: parseInt(row.get('Duration_Months')) || 1,
      Start_Date: row.get('Start_Date'),
      Status: row.get('Status') || 'Active'
    }));
    res.json(emis);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. Fetch all EMI Payments (Ledger)
app.get('/emi-payments', async (req, res) => {
  try {
    const sheet = doc.sheetsByTitle['EMI_Payments'];
    const rows = await sheet.getRows();
    const payments = rows.map(row => ({
      Payment_ID: row.get('Payment_ID'),
      EMI_ID: row.get('EMI_ID'),
      Date: row.get('Date'),
      Amount: parseFloat(row.get('Amount')) || 0,
      Bank_Source: row.get('Bank_Source')
    }));
    res.json(payments);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 3. Add a new EMI Product
app.post('/emis', async (req, res) => {
  try {
    const sheet = doc.sheetsByTitle['EMIs'];
    const newId = `EMI-${Date.now()}`; // Generate a unique ID
    
    await sheet.addRow({
      EMI_ID: newId,
      Product_Name: req.body.productName,
      Total_Amount: req.body.totalAmount,
      Down_Payment: req.body.downPayment,
      Duration_Months: req.body.durationMonths,
      Start_Date: req.body.startDate,
      Bank_Source: req.body.bankSource,
      Status: 'Active'
    });
    
    res.json({ success: true, EMI_ID: newId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});


app.get('/shared-expenses', async (req, res) => {
  try {
    const sheet = doc.sheetsByTitle['Shared_Expenses'];
    const rows = await sheet.getRows();
    const splits = rows.map(row => ({
      Split_ID: row.get('Split_ID'),
      Txn_ID: row.get('Txn_ID'),
      Date: row.get('Date'),
      Friend_Name: row.get('Friend_Name'),
      Amount_Owed: parseFloat(row.get('Amount_Owed')) || 0,
      Description: row.get('Description'),
      Status: row.get('Status') || 'Pending'
    }));
    res.json(splits);
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
});

// --- SETTLE A SHARED EXPENSE ---
app.put('/shared-expenses/:id/settle', async (req, res) => {
  try {
    const sheet = doc.sheetsByTitle['Shared_Expenses'];
    const rows = await sheet.getRows();
    const rowToUpdate = rows.find(r => r.get('Split_ID') === req.params.id);
    if (rowToUpdate) {
      rowToUpdate.set('Status', 'Settled');
      await rowToUpdate.save();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Split not found" });
    }
  } catch (error) { 
    res.status(500).json({ error: error.message }); 
  }
});



// ==========================================
// 1. EDIT TRANSACTION ENGINE
// ==========================================
app.put('/transactions/:id', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Transactions'];
    const rows = await sheet.getRows();
    const rowToUpdate = rows.find(r => r.get('Txn_ID') === req.params.id);

    if (rowToUpdate) {
      rowToUpdate.set('Date', req.body.Date);
      rowToUpdate.set('Description', req.body.Description);
      rowToUpdate.set('Amount', req.body.Amount);
      rowToUpdate.set('Type', req.body.Type);
      rowToUpdate.set('Category', req.body.Category);
      await rowToUpdate.save();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Transaction not found" });
    }
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: error.message }); 
  }
});

// ==========================================
// 2. LOG EMI PAYMENT ENGINE
// ==========================================
app.post('/emi-payments', async (req, res) => {
  try {
    await doc.loadInfo();
    // Assumes you already created the 'EMI_Payments' tab in Google Sheets earlier
    const sheet = doc.sheetsByTitle['EMI_Payments'];
    const newPaymentId = `EMI-PAY-${Date.now()}`;

    await sheet.addRow({
      Payment_ID: newPaymentId,
      EMI_ID: req.body.EMI_ID,
      Date: req.body.Date,
      Amount: req.body.Amount,
      Bank_Source: req.body.Bank_Source || 'Bank Account'
    });

    res.json({ success: true, Payment_ID: newPaymentId });
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: error.message }); 
  }
});

// ==========================================
// 3. SMART BILL PAYMENT TRACKER ENGINE
// ==========================================
// This dynamically scans the ledger. If a bill generates on June 1st, 
// it captures all payments from June 2nd to July 1st and applies it to the June bill!
app.get('/bill-summary/:cardId', async (req, res) => {
  try {
    await doc.loadInfo();
    const txnSheet = doc.sheetsByTitle['Transactions'];
    const cardSheet = doc.sheetsByTitle['Credit_Cards'];

    const [txnRows, cardRows] = await Promise.all([
        txnSheet.getRows(),
        cardSheet.getRows()
    ]);

    const card = cardRows.find(c => c.get('Card_ID') === req.params.cardId);
    if (!card) return res.status(404).json({ error: "Card not found" });

    const billingDay = parseInt(card.get('Billing_Day')) || 13;

    // Filter txns for this specific card
    const cardTxns = txnRows
      .filter(r => r.get('Card_ID') === req.params.cardId)
      .map(r => ({
         Date: new Date(r.get('Date')),
         Amount: parseFloat(r.get('Amount')) || 0,
         Type: r.get('Type')
      }));

    // The exact same statement date logic from your frontend
    const getBillingCycle = (dateObj, bDay) => {
      let month = dateObj.getMonth();
      let year = dateObj.getFullYear();
      if (dateObj.getDate() > bDay) {
        month += 1;
        if (month > 11) { month = 0; year += 1; }
      }
      if (bDay <= 5) { 
        month -= 1;
        if (month < 0) { month = 11; year -= 1; }
      }
      return new Date(year, month, 1).toLocaleString('en-US', { month: 'short', year: 'numeric' });
    };

    const cycles = {};

    cardTxns.forEach(txn => {
       const cycleName = getBillingCycle(txn.Date, billingDay);
       if (!cycles[cycleName]) cycles[cycleName] = { generated: 0, paid: 0 };

       if (txn.Type === 'Expense') cycles[cycleName].generated += txn.Amount;
       if (txn.Type === 'Refund' || txn.Type === 'Cashback') cycles[cycleName].generated -= txn.Amount;

       // THE MAGIC: If it's a payment, it pays off the PREVIOUS month's bill!
       if (txn.Type === 'Payment') {
          let prevMonthDate = new Date(txn.Date);
          prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
          const targetCycleName = getBillingCycle(prevMonthDate, billingDay);

          if (!cycles[targetCycleName]) cycles[targetCycleName] = { generated: 0, paid: 0 };
          cycles[targetCycleName].paid += txn.Amount;
       }
    });

    res.json(cycles);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: error.message }); 
  }
});



// ==========================================
// 4. MASTER DATA: FRIENDS
// ==========================================
app.get('/friends', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Friend_List'];
    const rows = await sheet.getRows();
    res.json(rows.map(r => ({ id: r.get('Friend_ID'), name: r.get('Name') })));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/friends', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Friend_List'];
    const newId = `FRND-${Date.now()}`;
    await sheet.addRow({ Friend_ID: newId, Name: req.body.name, Date_Added: new Date().toISOString() });
    res.json({ success: true, id: newId, name: req.body.name });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 5. MASTER DATA: PAYMENT MODES
// ==========================================
app.get('/payment-modes', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Payment_Modes'];
    const rows = await sheet.getRows();
    res.json(rows.map(r => ({ id: r.get('Mode_ID'), name: r.get('Mode_Name'), type: r.get('Type') })));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/payment-modes', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Payment_Modes'];
    const newId = `PAY-${Date.now()}`;
    await sheet.addRow({ Mode_ID: newId, Mode_Name: req.body.name, Type: req.body.type });
    res.json({ success: true, id: newId, name: req.body.name, type: req.body.type });
  } catch (error) { res.status(500).json({ error: error.message }); }
});


// --- EDIT & DELETE FRIEND ---
app.put('/friends/:id', async (req, res) => {
  try {
    const sheet = doc.sheetsByTitle['Friend_List'];
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('Friend_ID') === req.params.id);
    if (row) {
      row.set('Name', req.body.name);
      await row.save();
      res.json({ success: true });
    } else res.status(404).json({ error: "Friend not found" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/friends/:id', async (req, res) => {
  try {
    const sheet = doc.sheetsByTitle['Friend_List'];
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('Friend_ID') === req.params.id);
    if (row) {
      await row.delete();
      res.json({ success: true });
    } else res.status(404).json({ error: "Friend not found" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// --- EDIT & DELETE PAYMENT MODE ---
app.put('/payment-modes/:id', async (req, res) => {
  try {
    const sheet = doc.sheetsByTitle['Payment_Modes'];
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('Mode_ID') === req.params.id);
    if (row) {
      row.set('Mode_Name', req.body.name);
      if (req.body.type) row.set('Type', req.body.type);
      await row.save();
      res.json({ success: true });
    } else res.status(404).json({ error: "Mode not found" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.delete('/payment-modes/:id', async (req, res) => {
  try {
    const sheet = doc.sheetsByTitle['Payment_Modes'];
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('Mode_ID') === req.params.id);
    if (row) {
      await row.delete();
      res.json({ success: true });
    } else res.status(404).json({ error: "Mode not found" });
  } catch (error) { res.status(500).json({ error: error.message }); }
});



// ==========================================
// 6. WEALTH & SAVINGS ENGINE
// ==========================================

// Get all Savings Categories (MFs, ETFs, Goals)
app.get('/savings', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Savings_Master'];
    const rows = await sheet.getRows();
    res.json(rows.map(r => ({
      id: r.get('Saving_ID'),
      name: r.get('Name'),
      category: r.get('Category'),
      targetAmount: parseFloat(r.get('Target_Amount')) || null,
      currentValue: parseFloat(r.get('Current_Value')) || 0
    })));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Add a new Saving Category (e.g., Adding a new MF or Trip)
app.post('/savings', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Savings_Master'];
    const newId = `SAVE-${Date.now()}`;
    await sheet.addRow({
      Saving_ID: newId,
      Name: req.body.name,
      Category: req.body.category,
      Target_Amount: req.body.targetAmount || '',
      Current_Value: req.body.currentValue || 0
    });
    res.json({ success: true, id: newId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Get Savings Ledger (All your deposits/SIPs)
app.get('/savings-ledger', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Savings_Ledger'];
    const rows = await sheet.getRows();
    res.json(rows.map(r => ({
      id: r.get('Txn_ID'),
      savingId: r.get('Saving_ID'),
      date: r.get('Date'),
      amount: parseFloat(r.get('Amount')) || 0,
      bank: r.get('Bank_Source')
    })));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// Add a new Deposit/SIP
app.post('/savings-ledger', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Savings_Ledger'];
    const newId = `S-TXN-${Date.now()}`;
    await sheet.addRow({
      Txn_ID: newId,
      Saving_ID: req.body.savingId,
      Date: req.body.date,
      Amount: req.body.amount,
      Bank_Source: req.body.bank
    });
    res.json({ success: true, id: newId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// ==========================================
// 7. INCOME ENGINE (For Monthly Cashflow Summary)
// ==========================================
app.get('/income', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Income_Ledger'];
    const rows = await sheet.getRows();
    res.json(rows.map(r => ({
      id: r.get('Income_ID'),
      date: r.get('Date'),
      source: r.get('Source'),
      amount: parseFloat(r.get('Amount')) || 0,
      cycle: r.get('Month_Cycle')
    })));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/income', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Income_Ledger'];
    const newId = `INC-${Date.now()}`;
    await sheet.addRow({
      Income_ID: newId,
      Date: req.body.date,
      Source: req.body.source,
      Amount: req.body.amount,
      Month_Cycle: req.body.cycle
    });
    res.json({ success: true, id: newId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});


// ==========================================
// 8. ULTIMATE BANK RECONCILIATION ENGINE
// ==========================================

// Log a Self-Transfer (e.g., ICICI to BOM)
app.post('/bank-transfers', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Bank_Transfers'];
    const newId = `TRF-${Date.now()}`;
    await sheet.addRow({
      Transfer_ID: newId,
      Date: req.body.date,
      From_Bank: req.body.fromBank,
      To_Bank: req.body.toBank,
      Amount: req.body.amount,
      Description: req.body.description || 'Self Transfer'
    });
    res.json({ success: true, id: newId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// The Unified Bank Ledger Fetcher
app.get('/bank-ledger/:bankName', async (req, res) => {
  try {
    const bank = req.params.bankName;
    await doc.loadInfo();
    
    // Fetch all 5 sheets in parallel
    const [incSheet, trfSheet, emiSheet, savSheet, txnSheet] = await Promise.all([
      doc.sheetsByTitle['Income_Ledger']?.getRows() || [],
      doc.sheetsByTitle['Bank_Transfers']?.getRows() || [],
      doc.sheetsByTitle['EMI_Payments']?.getRows() || [],
      doc.sheetsByTitle['Savings_Ledger']?.getRows() || [],
      doc.sheetsByTitle['Transactions']?.getRows() || [] // <-- NEW!
    ]);

    let ledger = [];

    // 1. DAILY TRANSACTIONS (Expenses/Refunds from this bank)
    txnSheet.forEach(r => {
      if (r.get('Card_ID') === bank) {
        ledger.push({
          id: r.get('Txn_ID'), date: r.get('Date'),
          description: r.get('Description'), category: r.get('Category'),
          type: r.get('Type') === 'Expense' ? 'Debit' : 'Credit',
          amount: parseFloat(r.get('Amount')) || 0,
          isSelf: false
        });
      }
    });

    // 2. INCOMES (Credit to this bank)
    incSheet.forEach(r => {
      if (r.get('Bank_Source') === bank) {
        ledger.push({
          id: r.get('Income_ID'), date: r.get('Date'),
          description: r.get('Source'), category: 'Income',
          type: 'Credit', amount: parseFloat(r.get('Amount')) || 0,
          isSelf: false
        });
      }
    });

    // 3. EMIs (Debit from this bank)
    emiSheet.forEach(r => {
      if (r.get('Bank_Source') === bank) {
        ledger.push({
          id: r.get('Payment_ID'), date: r.get('Date'),
          description: `EMI Payment`, category: 'EMI',
          type: 'Debit', amount: parseFloat(r.get('Amount')) || 0,
          isSelf: false
        });
      }
    });

    // 4. SAVINGS / INVESTMENTS (Debit from this bank)
    savSheet.forEach(r => {
      if (r.get('Bank_Source') === bank) {
        ledger.push({
          id: r.get('Txn_ID'), date: r.get('Date'),
          description: `Investment Deposit`, category: 'Savings',
          type: 'Debit', amount: parseFloat(r.get('Amount')) || 0,
          isSelf: false
        });
      }
    });

    // 5. SELF TRANSFERS (Can be Credit or Debit)
    trfSheet.forEach(r => {
      const amt = parseFloat(r.get('Amount')) || 0;
      if (r.get('From_Bank') === bank) {
        ledger.push({
          id: r.get('Transfer_ID') + '-out', date: r.get('Date'),
          description: `Transfer to ${r.get('To_Bank')}`, category: 'Self Transfer',
          type: 'Debit', amount: amt, isSelf: true
        });
      }
      if (r.get('To_Bank') === bank) {
        ledger.push({
          id: r.get('Transfer_ID') + '-in', date: r.get('Date'),
          description: `Transfer from ${r.get('From_Bank')}`, category: 'Self Transfer',
          type: 'Credit', amount: amt, isSelf: true
        });
      }
    });

    ledger.sort((a, b) => new Date(b.date) - new Date(a.date));
    res.json(ledger);
  } catch (error) { 
    console.error(error);
    res.status(500).json({ error: error.message }); 
  }
});



// ==========================================
// 9. GIVE MONEY ENGINE
// ==========================================
app.get('/give-money', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Give_Money'];
    const rows = await sheet.getRows();
    res.json(rows.map(r => ({
      Give_ID: r.get('Give_ID'),
      Friend_Name: r.get('Friend_Name'),
      Date: r.get('Date'),
      Description: r.get('Description'),
      Amount_Owed: parseFloat(r.get('Amount')) || 0,
      Status: r.get('Status')
    })));
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/give-money', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Give_Money'];
    const newId = `GIVE-${Date.now()}`;
    await sheet.addRow({
      Give_ID: newId,
      Friend_Name: req.body.friend,
      Date: req.body.date,
      Description: req.body.description,
      Amount: req.body.amount,
      Status: 'Pending'
    });
    res.json({ success: true, id: newId });
  } catch (error) { res.status(500).json({ error: error.message }); }
});

app.post('/give-money/settle/:id', async (req, res) => {
  try {
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['Give_Money'];
    const rows = await sheet.getRows();
    const row = rows.find(r => r.get('Give_ID') === req.params.id);
    if (row) {
      row.set('Status', 'Settled');
      await row.save();
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  } catch (error) { res.status(500).json({ error: error.message }); }
});


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


// Phase 1: Deployment Strategy
// 1. Deploy the Node.js Backend (Render.com - Free & Reliable)
// Push your backend folder to a GitHub repository.
// Go to Render.com, create a New Web Service, and connect your GitHub repo.
// Set the Build Command to npm install and the Start Command to node server.js.
// Crucial Step: Go to the "Environment Variables" tab in Render and add your Google Sheets credentials (CLIENT_EMAIL, PRIVATE_KEY, SPREADSHEET_ID). Never commit your Google JSON key to GitHub.
// Deploy. Render will give you a live URL (e.g., [https://cc-tracker-api.onrender.com](https://cc-tracker-api.onrender.com)


// 2. Deploy the React Frontend (Vercel.com - Free & Lightning Fast)

// Open your frontend's src/api/client.js and change the baseURL to point to your new Render backend URL dynamically:

// JavaScript
// baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
// Push your frontend folder to GitHub.

// Go to Vercel.com, click Add New Project, and import the repo.

// In the Environment Variables section, add VITE_API_URL and paste your Render URL.

// Click Deploy. You now have a live, globally accessible PWA.
