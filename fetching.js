// Get max allowed hours for a given age
function getMaxAllowedHours(age) {
    if (age < 14) return 8;
    if (age < 16) return 10;
    if (age === 16 || age === 17) return 12;
    return Infinity;
}


async function fetchAndParseMemberTotalHours(memberId, startDate, endDate, age = 18, headless = false) {
    
    const maxHours = getMaxAllowedHours(age);

    // Helper to process a table (either from DOM or parsed HTML)
    function processTable(tableRoot, highlight = false) {
        console.log(tableRoot)
        let totalHours = 0;
        const totalEvents = tableRoot.querySelectorAll("table tbody tr");
        for (const event of totalEvents) {
            const cells = event.querySelectorAll("td.currency");
            if (cells.length < 2) continue;
            const hoursCell = cells[cells.length-2];
            const totalCells = cells[cells.length-1];
            if (!hoursCell || !totalCells) continue;
            if (hoursCell.querySelector("span")) continue;
            let hoursTextCell = hoursCell.querySelector("a");
            if (!hoursTextCell) continue;
            let eventHours = parseFloat(hoursTextCell.textContent);
            if (!isNaN(eventHours)) {
                if (eventHours > maxHours) {
                    if (highlight) {
                        hoursCell.style.backgroundColor = "#ffcccc";
                        hoursTextCell.textContent = `${hoursTextCell.textContent} (${maxHours})`;
                        hoursCell.title = `Not counted: exceeds age limit (${maxHours} hrs)`;
                        totalCells.textContent = `${totalCells.textContent - eventHours + maxHours}`;
                    }
                    eventHours = maxHours;
                }
                totalHours += eventHours;
            }
            else continue
            const breakCell = cells[cells.length-3];
            if (breakCell) {
                const breakHours = parseFloat(breakCell.textContent.replace(/[^0-9.-]+/g, ""));
                if (!isNaN(breakHours)) {
                    totalHours -= breakHours;
                }
            }
        }
        const oldTotal = tableRoot.querySelectorAll('tfoot td.currency')[2];
        oldTotal.textContent = totalHours.toFixed(2);
        // Add admin hours if present
        const adminHours = tableRoot.querySelector('#admin-hours-graph');
        if (adminHours) {
            const paragraphElements = adminHours.parentElement.querySelectorAll('p');
            paragraphElements.forEach(p => {
                const match = p.textContent.match(/^Total for period:\s*([\d.]+)/);
                if (match) {
                    totalHours += parseFloat(match[1]);
                }
            });
        }
        return totalHours;
    }
    
    if (headless) {
        const params = [];
        let url = `https://sjc.stjohnvic.com.au/members/${memberId}/hours`;
        if (startDate) params.push(`start_date=${startDate}`);
        if (endDate) params.push(`end_date=${endDate}`);
        if (params.length) url += `?${params.join('&')}`;
        const response = await fetch(url, { credentials: "include" });
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        return processTable(doc, false);
    } else {
        // No point in fetching if we are already on the page
        return processTable(document, true);
    }
}
