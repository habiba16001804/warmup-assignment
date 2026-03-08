const fs = require("fs");


function convertToSeconds(timeStr) {
    let parts = timeStr.split(" ");
    let time = parts[0];
    let period = parts[1];
    let t = time.split(":");
    let hours = parseInt(t[0]);
    let minutes = parseInt(t[1]);
    let seconds = parseInt(t[2]);
    if (period === "pm" && hours !== 12) {
        hours += 12;
    }
    if (period === "am" && hours === 12) {
        hours = 0;
    }
    let totalSeconds = hours * 3600 + minutes * 60 + seconds;
    return totalSeconds;
}

function durationToSeconds(durationStr) {
    let parts = durationStr.split(":");
    let h = parseInt(parts[0]);
    let m = parseInt(parts[1]);
    let s = parseInt(parts[2]);
    return h * 3600 + m * 60 + s;
}
function secondsToDuration(totalSeconds) {
    let h = Math.floor(totalSeconds / 3600);
    let m = Math.floor((totalSeconds % 3600) / 60);
    let s = totalSeconds % 60;
    return h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

function getDayName(dateStr) {
    let d = new Date(dateStr);
    let dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return dayNames[d.getDay()];
}



// ============================================================
// Function 1: getShiftDuration(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getShiftDuration(startTime, endTime) {
    let start = convertToSeconds(startTime);
    let end = convertToSeconds(endTime);

    let diff = end - start;

    let h = Math.floor(diff / 3600);
    let m = Math.floor((diff % 3600) / 60);
    let s = diff % 60;

    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================
// Function 2: getIdleTime(startTime, endTime)
// startTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// endTime: (typeof string) formatted as hh:mm:ss am or hh:mm:ss pm
// Returns: string formatted as h:mm:ss
// ============================================================
function getIdleTime(startTime, endTime) {
    let start = convertToSeconds(startTime);
    let end = convertToSeconds(endTime);

    let totalShift = end - start;
    let deliveryStart = 8 * 3600;
    let deliveryEnd = 22 * 3600;
    let overlapStart = Math.max(start, deliveryStart);
    let overlapEnd = Math.min(end, deliveryEnd);

    let workingOverlap = 0;
    if (overlapEnd > overlapStart) {
        workingOverlap = overlapEnd - overlapStart;
    }
    let idleSeconds = totalShift - workingOverlap;

    let h = Math.floor(idleSeconds / 3600);
    let m = Math.floor((idleSeconds % 3600) / 60);
    let s = idleSeconds % 60;

    let formattedTime = h + ":" + String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
    return formattedTime;
}

// ============================================================
// Function 3: getActiveTime(shiftDuration, idleTime)
// shiftDuration: (typeof string) formatted as h:mm:ss
// idleTime: (typeof string) formatted as h:mm:ss
// Returns: string formatted as h:mm:ss
// ============================================================
function getActiveTime(shiftDuration, idleTime) {
    let shiftSec = durationToSeconds(shiftDuration);
    let idleSec = durationToSeconds(idleTime);
    let activeSec = shiftSec - idleSec;
    return secondsToDuration(activeSec);
}

// ============================================================
// Function 4: metQuota(date, activeTime)
// date: (typeof string) formatted as yyyy-mm-dd
// activeTime: (typeof string) formatted as h:mm:ss
// Returns: boolean
// ============================================================
function metQuota(date, activeTime) {
   let d = new Date(date);
    let eidStart = new Date("2025-04-10");
    let eidEnd = new Date("2025-04-30");
    let quota;
    if (d >= eidStart && d <= eidEnd) {
        quota = "6:00:00";
    }
    else {
        quota = "08:24:00";
    }
    let activeSeconds = durationToSeconds(activeTime);
    let quotaSeconds = durationToSeconds(quota);
    if (activeSeconds >= quotaSeconds) {
        return true;
    }
    else {
        return false;
    }
}

// ============================================================
// Function 5: addShiftRecord(textFile, shiftObj)
// textFile: (typeof string) path to shifts text file
// shiftObj: (typeof object) has driverID, driverName, date, startTime, endTime
// Returns: object with 10 properties or empty object {}
// ============================================================
function addShiftRecord(textFile, shiftObj) {
        let content = fs.readFileSync(textFile, "utf8");
    let rows = content.split("\n");
    let cleanRows = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].trim() !== "") {
            cleanRows.push(rows[i]);
        }
    }
    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");
        let existingDriverID = cols[0];
        let existingDate = cols[2];
        if (existingDriverID === shiftObj.driverID && existingDate === shiftObj.date) {
            return {};
        }
    }
    let shiftDuration = getShiftDuration(shiftObj.startTime, shiftObj.endTime);
    let idleTime = getIdleTime(shiftObj.startTime, shiftObj.endTime);
    let activeTime = getActiveTime(shiftDuration, idleTime);
    let metQuotaValue = metQuota(shiftObj.date, activeTime);
    let hasBonus = false;

    let newRecordObj = {
        driverID: shiftObj.driverID,
        driverName: shiftObj.driverName,
        date: shiftObj.date,
        startTime: shiftObj.startTime,
        endTime: shiftObj.endTime,
        shiftDuration: shiftDuration,
        idleTime: idleTime,
        activeTime: activeTime,
        metQuota: metQuotaValue,
        hasBonus: hasBonus
    };

    let newRow =
        newRecordObj.driverID + "," +
        newRecordObj.driverName + "," +
        newRecordObj.date + "," +
        newRecordObj.startTime + "," +
        newRecordObj.endTime + "," +
        newRecordObj.shiftDuration + "," +
        newRecordObj.idleTime + "," +
        newRecordObj.activeTime + "," +
        newRecordObj.metQuota + "," +
        newRecordObj.hasBonus;

    let insertIndex = -1;
    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");
        let existingDriverID = cols[0];

        if (existingDriverID === shiftObj.driverID) {
            insertIndex = i;
        }
    }

    if (insertIndex === -1) {
        cleanRows.push(newRow);
    } else {
        cleanRows.splice(insertIndex + 1, 0, newRow);
    }

    let newContent = cleanRows.join("\n");
    fs.writeFileSync(textFile, newContent);

    return newRecordObj;
}

// ============================================================
// Function 6: setBonus(textFile, driverID, date, newValue)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// date: (typeof string) formatted as yyyy-mm-dd
// newValue: (typeof boolean)
// Returns: nothing (void)
// ============================================================
function setBonus(textFile, driverID, date, newValue) {
    let content = fs.readFileSync(textFile, "utf8");
    let rows = content.split("\n");

    let cleanRows = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].trim() !== "") {
            cleanRows.push(rows[i]);
        }
    }
    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");
        let existingDriverID = cols[0];
        let existingDate = cols[2];
        if (existingDriverID === driverID && existingDate === date) {
            cols[9] = String(newValue);
            cleanRows[i] = cols.join(",");
        }
    }
    let newContent = cleanRows.join("\n");
    fs.writeFileSync(textFile, newContent);

}

// ============================================================
// Function 7: countBonusPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof string) formatted as mm or m
// Returns: number (-1 if driverID not found)
// ============================================================
function countBonusPerMonth(textFile, driverID, month) {
    let content = fs.readFileSync(textFile, "utf8");
    let rows = content.split("\n");

    let cleanRows = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].trim() !== "") {
            cleanRows.push(rows[i]);
        }
    }

    let count = 0;
    let driverFound = false;
    let targetMonth = parseInt(month);

    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");

        let existingDriverID = cols[0].trim();
        let date = cols[2].trim();
        let hasBonus = cols[9].trim().toLowerCase();

        if (existingDriverID === driverID) {
            driverFound = true;

            let dateParts = date.split("-");
            let rowMonth = parseInt(dateParts[1]);

            if (rowMonth === targetMonth && hasBonus === "true") {
                count++;
            }
        }
    }

    if (driverFound === false) {
        return -1;
    }

    return count;
}

// ============================================================
// Function 8: getTotalActiveHoursPerMonth(textFile, driverID, month)
// textFile: (typeof string) path to shifts text file
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getTotalActiveHoursPerMonth(textFile, driverID, month) {
    let content = fs.readFileSync(textFile, "utf8");
    let rows = content.split("\n");
    let cleanRows = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].trim() !== "") {
            cleanRows.push(rows[i]);
        }
    }
    let totalSeconds = 0;
    let targetMonth = parseInt(month);
    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");
        let existingDriverID = cols[0];
        let date = cols[2];
        let activeTime = cols[7];
        if (existingDriverID === driverID) {
            let dateParts = date.split("-");
            let rowMonth = parseInt(dateParts[1]);
            if (rowMonth === targetMonth) {
                totalSeconds = totalSeconds + durationToSeconds(activeTime);
            }
        }
    }
    return secondsToDuration(totalSeconds);
}

// ============================================================
// Function 9: getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month)
// textFile: (typeof string) path to shifts text file
// rateFile: (typeof string) path to driver rates text file
// bonusCount: (typeof number) total bonuses for given driver per month
// driverID: (typeof string)
// month: (typeof number)
// Returns: string formatted as hhh:mm:ss
// ============================================================
function getRequiredHoursPerMonth(textFile, rateFile, bonusCount, driverID, month) {
     let rateContent = fs.readFileSync(rateFile, "utf8");
    let rateRows = rateContent.split("\n");
    let cleanRateRows = [];
    for (let i = 0; i < rateRows.length; i++) {
        if (rateRows[i].trim() !== "") {
            cleanRateRows.push(rateRows[i]);
        }
    }
    let dayOff = "";
    for (let i = 0; i < cleanRateRows.length; i++) {
        let cols = cleanRateRows[i].split(",");
        let existingDriverID = cols[0];
        if (existingDriverID === driverID) {
            dayOff = cols[1];
        }
    }
    let content = fs.readFileSync(textFile, "utf8");
    let rows = content.split("\n");
    let cleanRows = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].trim() !== "") {
            cleanRows.push(rows[i]);
        }
    }
    let totalSeconds = 0;
    let targetMonth = parseInt(month);
    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");
        let existingDriverID = cols[0];
        let date = cols[2];
        if (existingDriverID === driverID) {
            let dateParts = date.split("-");
            let rowMonth = parseInt(dateParts[1]);
            if (rowMonth === targetMonth) {
                let dayName = getDayName(date);
                if (dayName !== dayOff) {
                    if (date >= "2025-04-10" && date <= "2025-04-30") {
                        totalSeconds = totalSeconds + durationToSeconds("6:00:00");
                    }
                    else {
                        totalSeconds = totalSeconds + durationToSeconds("8:24:00");
                    }
                }
            }
        }
    }

    totalSeconds = totalSeconds - (bonusCount * 2 * 3600);
    if (totalSeconds < 0) {
        totalSeconds = 0;
    }
    return secondsToDuration(totalSeconds);
}

// ============================================================
// Function 10: getNetPay(driverID, actualHours, requiredHours, rateFile)
// driverID: (typeof string)
// actualHours: (typeof string) formatted as hhh:mm:ss
// requiredHours: (typeof string) formatted as hhh:mm:ss
// rateFile: (typeof string) path to driver rates text file
// Returns: integer (net pay)
// ============================================================
function getNetPay(driverID, actualHours, requiredHours, rateFile) {
     let content = fs.readFileSync(rateFile, "utf8");
    let rows = content.split("\n");
    let cleanRows = [];
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].trim() !== "") {
            cleanRows.push(rows[i]);
        }
    }
    let basePay = 0;
    let tier = 0;

    for (let i = 0; i < cleanRows.length; i++) {
        let cols = cleanRows[i].split(",");
        let existingDriverID = cols[0];
        if (existingDriverID === driverID) {
            basePay = parseInt(cols[2]);
            tier = parseInt(cols[3]);
        }
    }
    let actualSeconds = durationToSeconds(actualHours);
    let requiredSeconds = durationToSeconds(requiredHours);
    let allowedMissingHours = 0;
    if (actualSeconds >= requiredSeconds) {
        return basePay;
    }
    let missingSeconds = requiredSeconds - actualSeconds;
    if (tier === 1) {
        allowedMissingHours = 50;
    }
    else if (tier === 2) {
        allowedMissingHours = 20;
    }
    else if (tier === 3) {
        allowedMissingHours = 10;
    }
    else if (tier === 4) {
        allowedMissingHours = 3;
    }
    let allowedMissingSeconds = allowedMissingHours * 3600;
    let remainingMissingSeconds = missingSeconds - allowedMissingSeconds;
    if (remainingMissingSeconds <= 0) {
        return basePay;
    }
    let missinghoursForDeduction = Math.floor(remainingMissingSeconds / 3600);
    let deductionRatePerHour = Math.floor(basePay / 185);
    let salaryDeduction = missinghoursForDeduction * deductionRatePerHour;
    let netPay = basePay - salaryDeduction;
    return netPay;
}

module.exports = {
    getShiftDuration,
    getIdleTime,
    getActiveTime,
    metQuota,
    addShiftRecord,
    setBonus,
    countBonusPerMonth,
    getTotalActiveHoursPerMonth,
    getRequiredHoursPerMonth,
    getNetPay
};
