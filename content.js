// CONFIG

const pastYears = 3; // How many years to show in the quick year select


// // Only run on the correct URL
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.type === 'getMemberId') {
//         const match = window.location.pathname.match(/\/members\/(\d+)\/hours/);
//         if (match) {
//             const memberId = match[1];
//             sendResponse({ memberId });  // 🔥 Respond directly
//         } else {
//             sendResponse({ error: "No member ID found in URL" });
//         }
//     }
//     // return true to allow async `sendResponse`
//     return true;
// });

// // Get age from URL param if present

// function getDateRangeFromUrl() {
//     const params = new URLSearchParams(document.location.search);
//     const startDate = params.get('start_date') || null
//     const endDate = params.get('end_date') || null;
//     return { startDate, endDate };
// }




const eventFilterDiv = document.getElementById('DataTables_Table_0_filter');
const pageFilter = document.querySelector('.page-filter')
const eventsHeader = document.querySelector('.content-box-header h3');

let ageInput, yearSelect, totalHoursElement;
let startDate = pageFilter.querySelector("[name='start_date']");
let endDate = pageFilter.querySelector("[name='end_date']");
// The members hours page 
(async () => {
    if (window.location.hostname === "sjc.stjohnvic.com.au" && /^\/members\/\d+\/hours/.test(window.location.pathname)) {

        const memberId = window.location.pathname.match(/\/members\/(\d+)\/hours/)[1];

        // Where we want to insert the age input
        if (eventFilterDiv) {
            ageDiv = createAgeInput();

            eventFilterDiv.insertAdjacentElement('afterend', ageDiv);
        }
        if (pageFilter) {
            // Create and insert the year select input
            const yearDiv = createYearInput();
            endDate.insertAdjacentElement('afterend', yearDiv);
        }
        const totalHours = await fetchAndParseMemberTotalHours(memberId, startDate.value, endDate.value, getAgeFromUrl());
        if (eventsHeader) {
            const oldTotal = eventsHeader.querySelector('.total-hours-display');
            if (oldTotal) oldTotal.remove();

            totalHoursElement = createTotalHoursElement(totalHours);
            eventsHeader.appendChild(totalHoursElement);
        }
    }
    // The grid view
    if (window.location.hostname === "sjc.stjohnvic.com.au" && /^\/members\/list/.test(window.location.pathname)) {
        const memberTable = document.querySelector('#DataTables_Table_0');

        const headerRow = table.querySelector('thead tr');
        const newHeaderCell = document.createElement('th');
        newHeaderCell.textContent = 'Total Countable Hours';
        headerRow.appendChild(newHeaderCell);

        // Add a new row for each member with their total hours
        const tbody = memberTable.querySelector('tbody');
        const members = tbody.querySelectorAll('tr');
        for (const member of members) {

            const memberIdCell = member.querySelector('td');
            const memberIdMatch = memberIdCell.querySelector('a').href.match(/\/members\/(\d+)\//);
            
            if (memberIdMatch) {
                const memberId = memberIdMatch[1];

                const totalHourCell = document.createElement('td');

                try {
                    let totalHours = (await fetchAndParseMemberTotalHours(memberId, startDate.value, endDate.value, getAgeFromUrl())).toFixed(2);
                    totalHourCell.textContent = totalHours;
                    member.appendChild(totalHourCell);
                }
                catch (error) {
                    console.error(`Error fetching total hours for member ${memberId}:`, error);
                    totalHourCell.textContent = 'Error';
                    member.appendChild(totalHourCell);
                }
            } else {
                console.warn("No member ID found in member:", member);
                const newCell = document.createElement('td');
                newCell.textContent = 'N/A';
                member.appendChild(newCell);
            }
        }
    }
})();



function reloadPage() {
    ageInput = document.querySelector('#ageInput');

    let ageValue = ageInput ? ageInput.value : 18; // Default to 18 if not present

    let startDateValue = startDate ? startDate.value : '01/01/2020'; // Default to 01/01/2020 if not present
    let endDateValue = endDate ? endDate.value : '31/12/2020'; // Default to 31/12/2020 if not present
    const memberId = window.location.pathname.match(/\/members\/(\d+)\/hours/)[1];
    const newUrl = `https://sjc.stjohnvic.com.au/members/${memberId}/hours?start_date=${startDateValue}&end_date=${endDateValue}&age=${ageValue}`;
    window.location.href = newUrl;
}




function createYearInput() {
    yearSelect = document.createElement('select');
    yearSelect.className = 'text-input date';
    yearSelect.style.marginLeft = '10px';
    yearSelect.title = "Quick year select";
    
    
    const currentYear = new Date().getFullYear();
    for (let i = currentYear; i >= currentYear - pastYears; i--) {
        const option = document.createElement('option');
        option.value = i;
        option.textContent = i;
        yearSelect.appendChild(option);
    }
    const [ startDay, startMonth, startYear ] = splitDateString(startDate.value);

    const [ endDay, endMonth, endYear ] = splitDateString(endDate.value);
    // Making the year select persistent
    if (startDay === "01" && startMonth === "01" && endDay === "31" && endMonth === "12" && startYear === endYear) {
        yearSelect.value = startYear;
    } else {
        yearSelect.value = currentYear; // Default to current year if not matching
    }
    
    yearSelect.addEventListener('change', () => {
        startDate.value = `01/01/${yearSelect.value}`;
        endDate.value = `31/12/${yearSelect.value}`;
        reloadPage();
    });
    return yearSelect;
}
function createTotalHoursElement(totalHours = 0) {
    totalHoursElement = document.createElement('span');
    totalHoursElement.className = 'total-hours-display';
    totalHoursElement.style = "margin-left: 18px; font-weight: bold; color: #1976d2;";
    totalHoursElement.textContent = `Total Countable Hours: ${totalHours.toFixed(2)}`;
    return totalHoursElement;
}
function createAgeInput() {
    let ageDiv = document.createElement('div');
    ageDiv.className = "";
    ageDiv.style = "display: inline-flex; align-items: center; margin-left: 16px; gap: 6px;";

    let ageLabel = document.createElement('label');
    ageLabel.textContent = "Age: ";
    ageLabel.style = "margin-bottom: 0; padding: 0 4px; margin-right: 4px;";
    
    ageInput = document.createElement('input');
    ageInput.type = "number";
    ageInput.min = "1";
    ageInput.id = "ageInput";
    ageInput.max = "99";
    ageInput.value = getAgeFromUrl();
    ageInput.className = "form-control input-sm";
    ageInput.style = "width: 60px; margin-right: 0;";

    let ageButton = document.createElement('button');
    ageButton.textContent = "Set";
    ageButton.className = "btn btn-primary btn-sm";
    ageButton.style.marginLeft = "0";
    
    ageButton.addEventListener('click', reloadPage);

    ageDiv.appendChild(ageLabel);
    ageDiv.appendChild(ageInput);
    ageDiv.appendChild(ageButton);

    return ageDiv;
}

function splitDateString(dateString) {
    const parts = dateString.split('/');
    return parts
}

function getAgeFromUrl() {
    const params = new URLSearchParams(document.location.search);
    // Fix: URL may have multiple ? (e.g. ...?start_date=...&end_date=...&age=...)
    // Use get('age') directly, but ensure the param is present and not empty
    let ageParam = params.get('age');
    if (ageParam === null || ageParam === "") return 18;
    const age = parseInt(ageParam, 10);
    return isNaN(age) ? 18 : age;
}