const disposableDomains = [
  /* Add a comprehensive list of disposable email domains here */
];

// Email validation functions
function isValidSyntax(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isDisposableEmail(email) {
    const domain = email.split('@')[1];
    return disposableDomains.includes(domain);
}

function isRoleBasedEmail(email) {
    const roleEmails = ['admin', 'support', 'info', 'contact', 'sales'];
    const username = email.split('@')[0];
    return roleEmails.includes(username.toLowerCase());
}

async function validateWithServer(email) {
    try {
        const response = await fetch('https://your-cloudflare-url/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        const result = await response.json();
        return result.isValid;
    } catch (error) {
        console.error('Error validating email with server:', error);
        return false;
    }
}

async function processFile() {
    const fileInput = document.getElementById('fileInput');
    if (!fileInput.files.length) {
        alert("Please upload an Excel or CSV file.");
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function (e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });

        let validEmails = [];
        let invalidEmails = [];

        for (const row of sheet) {
            for (const cell of row) {
                if (typeof cell === 'string' && cell.includes('@')) {
                    const email = cell.trim();

                    if (isValidSyntax(email) && !isDisposableEmail(email) && !isRoleBasedEmail(email)) {
                        const serverValidated = await validateWithServer(email);
                        if (serverValidated) {
                            validEmails.push(email);
                        } else {
                            invalidEmails.push(email);
                        }
                    } else {
                        invalidEmails.push(email);
                    }
                }
            }
        }

        generateOutput(validEmails, invalidEmails);
        generateChart(validEmails.length, invalidEmails.length);
    };

    reader.readAsArrayBuffer(file);
}

function generateOutput(validEmails, invalidEmails) {
    const wsValid = XLSX.utils.aoa_to_sheet([['Valid Emails'], ...validEmails.map(e => [e])]);
    const wsInvalid = XLSX.utils.aoa_to_sheet([['Invalid Emails'], ...invalidEmails.map(e => [e])]);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, wsValid, 'Valid Emails');
    XLSX.utils.book_append_sheet(wb, wsInvalid, 'Invalid Emails');

    XLSX.writeFile(wb, 'ValidatedEmails.xlsx');

    document.getElementById('totalEmails').textContent = `Total Emails: ${validEmails.length + invalidEmails.length}`;
    document.getElementById('validEmails').textContent = `Valid Emails: ${validEmails.length}`;
    document.getElementById('invalidEmails').textContent = `Invalid Emails: ${invalidEmails.length}`;
}

function generateChart(validCount, invalidCount) {
    const ctx = document.getElementById('emailChart').getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: {
            labels: ['Valid Emails', 'Invalid Emails'],
            datasets: [{
                data: [validCount, invalidCount],
                backgroundColor: ['#36a2eb', '#ff6384']
            }]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: 'Email Validation Results'
            }
        }
    });
}
