document.addEventListener('DOMContentLoaded', function() {
    let currentPage = 1;
    const pageSize = 10;
    let allAuditLogs = []; // Store all fetched audit logs here

    fetchToken();
    const form = document.getElementById('timeForm');

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
        }

        if (!timeTo) {
            timeTo = new Date().toISOString().split("T")[0]; // Today's date
        }

        // Ensure valid date range
        if (new Date(timeFrom) > new Date(timeTo)) {
            alert("The 'From' date cannot be later than the 'To' date.");
            return;
        }

        currentPage = 1; // Reset to first page on new search
        fetchTokenAndAuditLogs(timeFrom, timeTo);
    });

    function fetchTokenAndAuditLogs(timeFrom, timeTo) {
        let token = localStorage.getItem('accessToken');

        if (token) {
            fetchAuditLogs(token, timeFrom, timeTo);
        } else {
            fetchToken().then(token => {
                fetchAuditLogs(token, timeFrom, timeTo);
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
            hideLoader();
            return token;
        });
    }

    function fetchAuditLogs(token, timeFrom, timeTo) {
        const apiUrl = `https://AuditLogApplication-turbulent-kookaburra-ri.cfapps.eu10-004.hana.ondemand.com/getAuditLogs?time_from=${encodeURIComponent(timeFrom)}&time_to=${encodeURIComponent(timeTo)}`;
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
            allAuditLogs = data; // Store all logs
            paginateAndRenderTable(currentPage, pageSize);
            updatePagination(allAuditLogs.length, currentPage, pageSize);
            hideLoader();
        })
        .catch(error => console.error('Error fetching audit logs:', error));
    }

    function paginateAndRenderTable(page, size) {
        const paginatedData = paginate(allAuditLogs, page, size);
        populateTable(paginatedData);
    }

    function paginate(data, page, size) {
        const start = (page - 1) * size;
        const end = start + size;
        return data.slice(start, end);
    }

    function populateTable(data) {
        const tableBody = document.getElementById('auditTable').querySelector('tbody');
        tableBody.innerHTML = '';
    
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
        console.log("Message is " + message); 
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
                paginateAndRenderTable(currentPage, pageSize);
                updatePagination(totalItems, currentPage, pageSize);
            }
        });

        document.getElementById('nextPage').addEventListener('click', function() {
            if (currentPage < totalPages) {
                currentPage++;
                paginateAndRenderTable(currentPage, pageSize);
                updatePagination(totalItems, currentPage, pageSize);
            }
        });
    }
});
