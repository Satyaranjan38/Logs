document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    const pageSize = 10; // Limit
    let totalItems = 0;  // Total items from backend response

    const form = document.getElementById('timeForm');

    let timeFrom1 = new Date();
    timeFrom1.setMonth(timeFrom1.getMonth() - 2); // 2 months before today
    timeFrom1 = timeFrom1.toISOString().split("T")[0];
    timeFrom1 = timeFrom1 + "T16%3A55";

    let timeTo1 = new Date().toISOString().split("T")[0]; // Today's date
    timeTo1 = timeTo1 + "T16%3A55";

    fetchTokenAndAuditLogs(timeFrom1, timeTo1, pageSize, 0); // Initial fetch with offset 0

    // Date validation to prevent future dates
    document.getElementById('time_from').max = new Date().toISOString().split("T")[0];
    document.getElementById('time_to').max = new Date().toISOString().split("T")[0];

    form.addEventListener('submit', function(event) {
        event.preventDefault();
        let timeFrom = document.getElementById('time_from').value;
        let timeTo = document.getElementById('time_to').value;

        // If dates are not provided, set defaults
        if (!timeFrom) {
            timeFrom = new Date();
            timeFrom.setMonth(timeFrom.getMonth() - 2); // 2 months before today
            timeFrom = timeFrom.toISOString().split("T")[0];
            timeFrom = timeFrom + "T16%3A55";
        }

        if (!timeTo) {
            timeTo = new Date().toISOString().split("T")[0]; // Today's date
            timeTo = timeTo + "T16%3A55";
        }

        // Ensure valid date range
        if (new Date(timeFrom) > new Date(timeTo)) {
            alert("The 'From' date cannot be later than the 'To' date.");
            return;
        }

        currentPage = 1; // Reset to first page on new search
        fetchTokenAndAuditLogs(timeFrom, timeTo, pageSize, 0);
    });

    function fetchTokenAndAuditLogs(timeFrom, timeTo, limit, offset) {
        let token = localStorage.getItem('accessToken');

        if (token) {
            fetchAuditLogs(token, timeFrom, timeTo, limit, offset);
        } else {
            fetchToken().then(token => {
                fetchAuditLogs(token, timeFrom, timeTo, limit, offset);
            }).catch(error => console.error('Error fetching token:', error));
        }
    }

    function showLoader() {
        const loader = document.getElementById('loader');
        loader.classList.add('active');
        loader.style.display = 'flex';
    }

    function hideLoader() {
        const loader = document.getElementById('loader');
        loader.classList.remove('active');
        loader.style.display = 'none';
    }

    function fetchToken() {
        showLoader();
        return fetch('https://AuditLogApplication-turbulent-kookaburra-ri.cfapps.eu10-004.hana.ondemand.com/tokenUtility', {
            method: 'GET',
        })
        .then(response => response.json())
        .then(data => {
            const token = data.token;
            localStorage.setItem('accessToken', token);
            return token;
        });
    }

    function fetchAuditLogs(token, timeFrom, timeTo, limit, offset) {
        const apiUrl = `https://AuditLogApplication-turbulent-kookaburra-ri.cfapps.eu10-004.hana.ondemand.com/getAuditLogs?time_from=${encodeURIComponent(timeFrom)}&time_to=${encodeURIComponent(timeTo)}&limit=${limit}&offset=${offset}`;
        showLoader();
        fetch(apiUrl, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
        .then(response => {
            if (!response.ok) {
                return fetchToken().then(newToken => {
                    return fetch(apiUrl, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${newToken}`
                        }
                    });
                });
            }
            return response.json();
        })
        .then(data => {
            totalItems = data.totalItems; // Assuming totalItems is returned by the API
            populateTable(data); // Assuming 'logs' contains the audit log entries
            updatePagination(totalItems, currentPage, pageSize);
            hideLoader();
        })
        .catch(error => console.error('Error fetching audit logs:', error));
    }

    function populateTable(data) {
        
        const tableBody = document.getElementById('auditTable').querySelector('tbody');
        tableBody.innerHTML = '';
    
        if (!data || !data.length) {
            // Handle the case when data is undefined or an empty array
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="7">No audit logs found.</td>`;
            tableBody.appendChild(row);
            return;
        }
    
        data.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.message_uuid}</td>
                <td>${new Date(log.time).toLocaleString()}</td>
                <td>${log.tenant}</td>
                <td>${log.org_id}</td>
                <td>${log.space_id}</td>
                <td>${log.category}</td>
                <td><button class="show-message-btn" data-message="${encodeURIComponent(log.message)}">Show Message</button></td>
            `;
            tableBody.appendChild(row);
        });
    
        // Add event listeners to "Show Message" buttons
        document.querySelectorAll('.show-message-btn').forEach(button => {
            button.addEventListener('click', function() {
                const encodedMessage = this.getAttribute('data-message');
                const message = decodeURIComponent(encodedMessage);
    
                try {
                    const parsedMessage = JSON.parse(message);
                    const formattedMessage = JSON.stringify(parsedMessage, null, 2); // Indent for readability
                    showMessageModal(formattedMessage);
                } catch (e) {
                    console.error('Error parsing message:', e);
                    showMessageModal('Invalid message format');
                }
            });
        });
    }
    

    function showMessageModal(message) {
        const modal = document.getElementById('messageModal');
        const fullMessageElement = document.getElementById('fullMessage');
        fullMessageElement.textContent = message;
        modal.style.display = 'block';
    }

    // Close modal on clicking 'X'
    document.querySelector('.close').addEventListener('click', function() {
        document.getElementById('messageModal').style.display = 'none';
    });

    // Close the modal when the user clicks anywhere outside of it
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('messageModal');
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    function updatePagination(totalItems, currentPage, pageSize) {
        const totalPages = Math.ceil(totalItems / pageSize);
        document.getElementById('currentPage').textContent = currentPage;

        document.getElementById('prevPage').disabled = currentPage === 1;
        document.getElementById('nextPage').disabled = currentPage === totalPages;

        document.getElementById('prevPage').addEventListener('click', function() {
            if (currentPage > 1) {
                currentPage--;
                const offset = (currentPage - 1) * pageSize;
                fetchTokenAndAuditLogs(document.getElementById('time_from').value, document.getElementById('time_to').value, pageSize, offset);
            }
        });

        document.getElementById('nextPage').addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                const offset = (currentPage - 1) * pageSize;
                fetchTokenAndAuditLogs(document.getElementById('time_from').value, document.getElementById('time_to').value, pageSize, offset);
            }
        });
    }
});
