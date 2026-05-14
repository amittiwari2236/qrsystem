const { auth, google } = require('../config/googleConfig');

const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });

/**
 * Creates a new Tab (Sheet) inside the Master Spreadsheet dynamically
 * @param {string} spreadsheetId - The Master Spreadsheet ID
 * @param {string} title - The title of the new tab (e.g., EventName_AdminName_Date)
 */
async function createSheetTab(spreadsheetId, title) {
    try {
        // Check if tab already exists
        const getRes = await sheets.spreadsheets.get({ spreadsheetId });
        const existingTabs = getRes.data.sheets.map(s => s.properties.title);
        
        if (existingTabs.includes(title)) {
            console.log(`Tab '${title}' already exists. Reusing it.`);
            return title;
        }

        const resource = {
            requests: [
                {
                    addSheet: {
                        properties: {
                            title: title,
                        }
                    }
                }
            ]
        };
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource,
        });

        // After successfully creating a new tab, delete "Sheet1" if it exists and is an orphan
        await deleteDefaultSheet1(spreadsheetId, getRes.data.sheets);

        return title;
    } catch (error) {
        console.error('Error creating tab:', error);
        throw error;
    }
}

/**
 * Initializes the newly created tab with column headers
 */
async function initializeSheetColumns(spreadsheetId, tabName, columns) {
    try {
        const values = [columns];
        const resource = { values };
        
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range: `${tabName}!A1`,
            valueInputOption: 'RAW',
            resource,
        });

        // Apply conditional formatting for Status column (Column L)
        await applyStatusFormatting(spreadsheetId, tabName);
    } catch (error) {
        console.error('Error initializing columns:', error);
        throw error;
    }
}

/**
 * Applies conditional formatting to the Status column (Column L)
 */
async function applyStatusFormatting(spreadsheetId, tabName) {
    try {
        const getRes = await sheets.spreadsheets.get({ spreadsheetId });
        const targetSheet = getRes.data.sheets.find(s => s.properties.title === tabName);
        if (!targetSheet) return;
        const sheetId = targetSheet.properties.sheetId;

        const requests = [
            {
                // Set alignment for the entire column to make it look like centered badges
                repeatCell: {
                    range: { sheetId, startColumnIndex: 11, endColumnIndex: 12, startRowIndex: 1 },
                    cell: {
                        userEnteredFormat: {
                            horizontalAlignment: 'CENTER',
                            verticalAlignment: 'MIDDLE',
                            textFormat: { bold: true }
                        }
                    },
                    fields: 'userEnteredFormat(horizontalAlignment,verticalAlignment,textFormat)'
                }
            },
            {
                addConditionalFormatRule: {
                    rule: {
                        ranges: [{ sheetId, startColumnIndex: 11, endColumnIndex: 12, startRowIndex: 1 }],
                        booleanRule: {
                            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Present' }] },
                            format: {
                                backgroundColor: { red: 0.133, green: 0.772, blue: 0.368 }, // Neon Green
                                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }
                            }
                        }
                    },
                    index: 0
                }
            },
            {
                addConditionalFormatRule: {
                    rule: {
                        ranges: [{ sheetId, startColumnIndex: 11, endColumnIndex: 12, startRowIndex: 1 }],
                        booleanRule: {
                            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Pending' }] },
                            format: {
                                backgroundColor: { red: 0.937, green: 0.266, blue: 0.266 }, // Neon Red
                                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true }
                            }
                        }
                    },
                    index: 1
                }
            },
            {
                // Apply Data Validation with CHIP style for rounded appearance
                setDataValidation: {
                    range: { sheetId, startColumnIndex: 11, endColumnIndex: 12, startRowIndex: 1 },
                    rule: {
                        condition: { 
                            type: 'ONE_OF_LIST', 
                            values: [{ userEnteredValue: 'Present' }, { userEnteredValue: 'Pending' }] 
                        },
                        showCustomUi: true,
                        strict: true
                    }
                }
            }
        ];

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: { requests }
        });
    } catch (error) {
        console.error('Error applying conditional formatting:', error.message);
    }
}

/**
 * Saves the Admin Card details and assigned Sheet ID to the Master Sheet
 */
async function saveToMasterSheet(adminData) {
    // Disabled master sheet log append to prevent 'Sheet1' INVALID_ARGUMENT crashes
    // MongoDB serves as the single source of truth for all events.
    return;
}

/**
 * Appends a new registration row to a specific tab
 */
async function appendRegistrationRow(spreadsheetId, tabName, rowData) {
    try {
        const values = [rowData];
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${tabName}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            resource: { values },
        });
    } catch (error) {
        console.error('Error appending row:', error);
        throw error;
    }
}

/**
 * Updates a specific cell value
 */
async function updateCell(spreadsheetId, range, value) {
    try {
        const values = [[value]];
        const resource = { values };
        await sheets.spreadsheets.values.update({
            spreadsheetId,
            range,
            valueInputOption: 'USER_ENTERED',
            resource,
        });
    } catch (error) {
        console.error('Error updating cell:', error);
        throw error;
    }
}

/**
 * Gets registration data for an admin
 */
async function getRegistrations(spreadsheetId, tabName) {
    try {
        const response = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${tabName}!A:Z`,
        });
        return response.data.values || [];
    } catch (error) {
        console.error('Error fetching data:', error);
        throw error;
    }
}

/**
 * Appends multiple rows to a specific tab (used for bulk file uploads)
 */
async function appendBulkRows(spreadsheetId, tabName, valuesArray) {
    try {
        await sheets.spreadsheets.values.append({
            spreadsheetId,
            range: `${tabName}!A:Z`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: valuesArray },
        });
    } catch (error) {
        console.error('Error bulk appending rows:', error);
        throw error;
    }
}

/**
 * Helper function to delete the default "Sheet1" if it exists
 */
async function deleteDefaultSheet1(spreadsheetId, currentSheets) {
    try {
        const sheet1 = currentSheets.find(s => s.properties.title === 'Sheet1');
        if (sheet1) {
            const sheetId = sheet1.properties.sheetId;
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [
                        {
                            deleteSheet: {
                                sheetId: sheetId
                            }
                        }
                    ]
                }
            });
            console.log("Deleted default 'Sheet1' successfully.");
        }
    } catch (error) {
        console.error("Failed to delete Sheet1. It may have already been deleted.", error.message);
    }
}

/**
 * Deletes a specific tab from the Master Spreadsheet
 */
async function deleteSheetTab(spreadsheetId, tabName) {
    try {
        const getRes = await sheets.spreadsheets.get({ spreadsheetId });
        const targetSheet = getRes.data.sheets.find(s => s.properties.title === tabName);
        
        if (targetSheet) {
            // If this is the only sheet, create a dummy sheet first to avoid API error
            if (getRes.data.sheets.length === 1) {
                await sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    resource: {
                        requests: [{ addSheet: { properties: { title: 'Sheet1' } } }]
                    }
                });
            }

            const sheetId = targetSheet.properties.sheetId;
            await sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                resource: {
                    requests: [
                        {
                            deleteSheet: {
                                sheetId: sheetId
                            }
                        }
                    ]
                }
            });
            console.log(`Deleted tab '${tabName}' successfully.`);
        }
    } catch (error) {
        console.error('Error deleting tab:', error);
        throw error;
    }
}

/**
 * Clears the content of a specific tab and resets the headers
 */
async function clearSheetTab(spreadsheetId, tabName, columns) {
    try {
        await sheets.spreadsheets.values.clear({
            spreadsheetId,
            range: `${tabName}!A:Z`
        });
        
        // Re-initialize headers
        await initializeSheetColumns(spreadsheetId, tabName, columns);
        console.log(`Cleared tab '${tabName}' and reset headers.`);
    } catch (error) {
        console.error('Error clearing tab:', error);
        throw error;
    }
}

/**
 * Deletes a specific row based on Scholar ID
 */
async function deleteRegistrationRow(spreadsheetId, tabName, scholarId) {
    try {
        // 1. Get sheetId
        const getRes = await sheets.spreadsheets.get({ spreadsheetId });
        const targetSheet = getRes.data.sheets.find(s => s.properties.title === tabName);
        if (!targetSheet) return false;
        const sheetId = targetSheet.properties.sheetId;

        // 2. Fetch all rows
        const valuesRes = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: `${tabName}!A:Z`
        });
        const rows = valuesRes.data.values || [];

        // 3. Find the row index with matching Scholar ID (assuming Scholar ID is in column A -> index 0)
        let rowIndexToDelete = -1;
        for (let i = 0; i < rows.length; i++) {
            if (rows[i][0] === scholarId) {
                rowIndexToDelete = i;
                break;
            }
        }

        if (rowIndexToDelete === -1) {
            console.log(`Scholar ID ${scholarId} not found in sheet.`);
            return false;
        }

        // 4. Delete the row
        await sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            resource: {
                requests: [
                    {
                        deleteDimension: {
                            range: {
                                sheetId: sheetId,
                                dimension: "ROWS",
                                startIndex: rowIndexToDelete,
                                endIndex: rowIndexToDelete + 1
                            }
                        }
                    }
                ]
            }
        });

        console.log(`Successfully deleted row ${rowIndexToDelete} for Scholar ID: ${scholarId}`);
        return true;
    } catch (error) {
        console.error('Error deleting specific row:', error);
        throw error;
    }
}

/**
 * Updates the attendance status for a specific registration in Google Sheets
 */
async function updateRegistrationStatus(spreadsheetId, tabName, scholarId, status) {
    try {
        const rows = await getRegistrations(spreadsheetId, tabName);
        if (!rows || rows.length === 0) return false;

        // Find the row index (assuming Scholar ID is in column A -> index 0)
        const sId = String(scholarId).trim().toLowerCase();
        const rowIndex = rows.findIndex(r => String(r[0]).trim().toLowerCase() === sId);

        if (rowIndex !== -1) {
            // Update QR Status column (index 11, column L)
            const range = `${tabName}!L${rowIndex + 1}`;
            await updateCell(spreadsheetId, range, status);
            
            // Ensure formatting is applied (especially for existing sheets)
            await applyStatusFormatting(spreadsheetId, tabName);
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error updating registration status in sheet:', error);
        return false;
    }
}

module.exports = {
    createSheetTab,
    initializeSheetColumns,
    saveToMasterSheet,
    appendRegistrationRow,
    getRegistrations,
    appendBulkRows,
    deleteSheetTab,
    clearSheetTab,
    deleteRegistrationRow,
    updateCell,
    updateRegistrationStatus
};
