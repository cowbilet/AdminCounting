// Only run on the correct URL
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'getMemberId') {
        const match = window.location.pathname.match(/\/members\/(\d+)\/hours/);
        if (match) {
            const memberId = match[1];
            sendResponse({ memberId });  // 🔥 Respond directly
        } else {
            sendResponse({ error: "No member ID found in URL" });
        }
    }
    // return true to allow async `sendResponse`
    return true;
});

// Get age from URL param if present
function getAgeFromUrl() {
    const params = new URLSearchParams(document.location.search);
    // Fix: URL may have multiple ? (e.g. ...?start_date=...&end_date=...&age=...)
    // Use get('age') directly, but ensure the param is present and not empty
    let ageParam = params.get('age');
    if (ageParam === null || ageParam === "") return 18;
    const age = parseInt(ageParam, 10);
    return isNaN(age) ? 18 : age;
}
function getDateRangeFromUrl() {
    const params = new URLSearchParams(document.location.search);
    const startDate = params.get('start_date') || null
    const endDate = params.get('end_date') || null;
    return { startDate, endDate };
}
if (window.location.hostname === "sjc.stjohnvic.com.au" && /^\/members\/list/.test(window.location.pathname)) {
    const table = document.querySelector('#DataTables_Table_0');
    // Add a new column for total hours
    const headerRow = table.querySelector('thead tr');
    const newHeaderCell = document.createElement('th');
    newHeaderCell.textContent = 'Total Countable Hours';
    headerRow.appendChild(newHeaderCell);
    // Add a new row for each member with their total hours
    const tbody = table.querySelector('tbody');
    const rows = tbody.querySelectorAll('tr');
    for (const row of rows) {
        //Get the member ID from the first cell
        const firstCell = row.querySelector('td');
        const memberIdMatch = firstCell.querySelector('a').href.match(/\/members\/(\d+)\//);
        if (memberIdMatch) {
            const memberId = memberIdMatch[1];
            // Create a new cell for total hours
            const newCell = document.createElement('td');
            // Fetch and parse total hours for this member
            fetchAndParseMemberTotalHours(memberId).then(total => {
                newCell.textContent = total.toFixed(2); // Format to 2 decimal places
                row.appendChild(newCell);
            }).catch(error => {
                console.error(`Error fetching total hours for member ${memberId}:`, error);
                newCell.textContent = 'Error';
                row.appendChild(newCell);
            });
        } else {
            console.warn("No member ID found in row:", row);
            const newCell = document.createElement('td');
            newCell.textContent = 'N/A';
            row.appendChild(newCell);
        }
    }
}
if (window.location.hostname === "sjc.stjohnvic.com.au" && /^\/members\/\d+\/hours/.test(window.location.pathname)) {
    window.addEventListener('load', async () => {
        let age = getAgeFromUrl();
        const memberId = window.location.pathname.match(/\/members\/(\d+)\/hours/)[1];
        const { startDate, endDate } = getDateRangeFromUrl();
        const totalHours = await fetchAndParseMemberTotalHours(memberId, startDate, endDate, age);

        const filterDiv = document.getElementById('DataTables_Table_0_filter');
        if (filterDiv) {
            // Create age input and button
            const ageDiv = document.createElement('div');
            ageDiv.className = "form-inline";
            ageDiv.style.display = "inline-flex";
            ageDiv.style.alignItems = "center";
            ageDiv.style.marginLeft = "16px";
            ageDiv.style.gap = "6px";

            const ageLabel = document.createElement('label');
            ageLabel.textContent = "Age: ";
            ageLabel.style.marginBottom = "0";
            ageLabel.style.padding = "0 4px";
            ageLabel.style.marginRight = "4px";

            const ageInput = document.createElement('input');
            ageInput.type = "number";
            ageInput.min = "1";
            ageInput.id = "ageInput";
            ageInput.max = "99";
            ageInput.value = getAgeFromUrl();
            ageInput.className = "form-control input-sm";
            ageInput.style.width = "60px";
            ageInput.style.marginRight = "0";

            const ageButton = document.createElement('button');
            ageButton.textContent = "Set";
            ageButton.className = "btn btn-primary btn-sm";
            ageButton.style.marginLeft = "0";

            ageDiv.appendChild(ageLabel);
            ageDiv.appendChild(ageInput);
            ageDiv.appendChild(ageButton);

            // Insert after filterDiv
            filterDiv.insertAdjacentElement('afterend', ageDiv);

            ageButton.addEventListener('click', () => {
                const newAge = parseInt(ageInput.value, 10);
                if (isNaN(newAge) || newAge < 1 || newAge > 99) {
                    alert("Please enter a valid age between 1 and 99.");
                    return;
                }
                // Redirect to the same page with updated age
                const { startDate, endDate } = getDateRangeFromUrl();
                const url = `https://sjc.stjohnvic.com.au/members/${window.location.pathname.match(/\/members\/(\d+)\/hours/)[1]}/hours?start_date=${startDate}&end_date=${endDate}&age=${newAge}`;
                window.location.href = url;
            });
        }

        // Add quick year select to .page-filter
        const pageFilter = document.querySelector('.page-filter');
        if (pageFilter) {
            const form = pageFilter.querySelector('form');
            const startDateInput = form.querySelector('[name="start_date"]');
            const endDateInput = form.querySelector('[name="end_date"]');
            // Create year select
            const yearSelect = document.createElement('select');
            yearSelect.className = 'text-input date';
            yearSelect.style.marginLeft = '10px';
            yearSelect.title = "Quick year select";

            const currentYear = new Date().getFullYear();
            for (let i = currentYear; i >= currentYear - 3; i--) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = i;
                yearSelect.appendChild(option);
            }

            // Insert year select after endDate input
            endDateInput.insertAdjacentElement('afterend', yearSelect);

            // Set dropdown to match date if possible
            const getYearFromDateStr = (dateStr) => {
                // Accepts dd/mm/yyyy or yyyy-mm-dd
                if (!dateStr) return null;
                if (dateStr.includes('/')) {
                    // dd/mm/yyyy
                    return parseInt(dateStr.split('/')[2], 10);
                } else if (dateStr.includes('-')) {
                    // yyyy-mm-dd
                    return parseInt(dateStr.split('-')[0], 10);
                }
                return null;
            };
            const startYear = getYearFromDateStr(startDateInput.value);
            const endYear = getYearFromDateStr(endDateInput.value);
            if (
                startYear &&
                endYear &&
                startDateInput.value === `01/01/${startYear}` &&
                endDateInput.value === `31/12/${endYear}` &&
                startYear === endYear
            ) {
                yearSelect.value = startYear;
            } else {
                yearSelect.selectedIndex = -1;
            }

            // When year is selected, update start/end date inputs to 01/01/YYYY and 31/12/YYYY
            yearSelect.addEventListener('change', () => {
                const selectedYear = parseInt(yearSelect.value, 10);
                const ageInput = document.querySelector('#ageInput');
                startDateInput.value = `01/01/${selectedYear}`;
                endDateInput.value = `31/12/${selectedYear}`;
                const newUrl = `https://sjc.stjohnvic.com.au/members/${memberId}/hours?start_date=${startDateInput.value}&end_date=${endDateInput.value}&age=${ageInput.value}`;
                window.location.href = newUrl;
            });

        }

        // Display total time in the Events Attended box header
        const eventsHeader = document.querySelector('.content-box-header h3');
        if (eventsHeader) {
            // Remove any previous total display
            const oldTotal = eventsHeader.querySelector('.total-hours-display');
            if (oldTotal) oldTotal.remove();

            const totalSpan = document.createElement('span');
            totalSpan.className = 'total-hours-display';
            totalSpan.style.marginLeft = '18px';
            totalSpan.style.fontWeight = 'bold';
            totalSpan.style.color = '#1976d2';
            totalSpan.textContent = `Total Countable Hours: ${totalHours.toFixed(2)}`;
            eventsHeader.appendChild(totalSpan);
        }
    });

}

