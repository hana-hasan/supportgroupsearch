class EventFilter {
    constructor() {
        this.filterForm = document.getElementById('filterForm');
        this.eventsContainer = document.getElementById('eventsContainer');
        this.selectedFilterTags = new Set();
        this.setupEventListeners();
        this.loadAllEvents(); // Load all events when page loads
        this.loadTags(); // Load available tags for filtering
    }

    setupEventListeners() {
        this.filterForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.applyFilters();
        });

        // Add reset handler to load all events when filters are reset
        this.filterForm.addEventListener('reset', () => {
            this.selectedFilterTags.clear();
            this.updateSelectedFilterTags();
            setTimeout(() => this.loadAllEvents(), 0);
        });
    }

    async loadAllEvents() {
        try {
            const response = await fetch('/api/events');
            const events = await response.json();
            this.displayEvents(events);
        } catch (error) {
            console.error('Error fetching events:', error);
            this.eventsContainer.innerHTML = '<p class="no-events">Failed to load events. Please try again later.</p>';
        }
    }

    async loadTags() {
        try {
            const response = await fetch('/api/tags');
            const tags = await response.json();
            const tagsContainer = document.getElementById('filter-tags-list');
            
            if (tagsContainer) {
                tagsContainer.innerHTML = tags.map(tag => `
                    <button type="button" 
                        onclick="eventFilter.toggleFilterTag('${tag.name}')"
                        class="px-4 py-2 bg-light text-primary rounded-lg hover:bg-gray-100 transition-all duration-200 font-actor ${
                            this.selectedFilterTags.has(tag.name) ? 'bg-secondary bg-opacity-10' : ''
                        }">
                        ${tag.name}
                    </button>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading tags:', error);
        }
    }

    toggleFilterTag(tagName) {
        if (this.selectedFilterTags.has(tagName)) {
            this.selectedFilterTags.delete(tagName);
        } else {
            this.selectedFilterTags.add(tagName);
        }
        this.updateSelectedFilterTags();
        this.applyFilters();
    }

    updateSelectedFilterTags() {
        const selectedTagsContainer = document.getElementById('selected-filter-tags');
        if (selectedTagsContainer) {
            selectedTagsContainer.innerHTML = Array.from(this.selectedFilterTags).map(tag => `
                <span class="inline-flex items-center px-4 py-2 bg-secondary bg-opacity-10 text-secondary rounded-lg font-actor">
                    ${tag}
                    <button type="button" 
                        class="ml-2 text-secondary hover:text-opacity-80 transition-all duration-200"
                        onclick="eventFilter.toggleFilterTag('${tag}')">
                        ×
                    </button>
                </span>
            `).join('');
        }
    }

    async applyFilters() {
        const formData = new FormData(this.filterForm);
        const params = new URLSearchParams();

        // Add date range
        if (formData.get('startDate')) {
            params.append('startDate', formData.get('startDate'));
        }
        if (formData.get('endDate')) {
            params.append('endDate', formData.get('endDate'));
        }

        // Add zip code
        if (formData.get('zipCode')) {
            params.append('zipCode', formData.get('zipCode'));
        }

        // Add selected tags
        if (this.selectedFilterTags.size > 0) {
            params.append('tags', Array.from(this.selectedFilterTags).join(','));
        }

        try {
            const response = await fetch(`/api/events?${params.toString()}`);
            const events = await response.json();
            this.displayEvents(events);
        } catch (error) {
            console.error('Error fetching filtered events:', error);
            alert('Error fetching events. Please try again.');
        }
    }

    displayEvents(events) {
        this.eventsContainer.innerHTML = '';
        
        if (events.length === 0) {
            this.eventsContainer.innerHTML = '<p class="no-events">No events found matching your criteria.</p>';
            return;
        }

        events.forEach(event => {
            const eventElement = document.createElement('div');
            eventElement.className = 'event-card';
            eventElement.innerHTML = `
                <h3>${event.name}</h3>
                <p class="description">${event.description}</p>
                <p class="details">
                    <strong>Date:</strong> ${event.date}<br>
                    <strong>Time:</strong> ${event.time}<br>
                    <strong>Location:</strong> ${event.address}, ${event.zipCode}<br>
                    <strong>Tags:</strong> ${event.tags ? event.tags.join(', ') : 'No tags'}
                </p>
                <div class="event-actions">
                    <button class="ical-btn" onclick="eventFilter.downloadICS('${event._id}', '${event.name}', '${event.description}', '${event.address}', '${event.date}', '${event.time}')">Add to iCal</button>
                    <button class="delete-btn" onclick="eventFilter.deleteEvent('${event._id}')">Delete</button>
                </div>
            `;
            this.eventsContainer.appendChild(eventElement);
        });
    }

    async deleteEvent(id) {
        if (!confirm('Are you sure you want to delete this event?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/events/${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error('Failed to delete event');
            }

            // Reload events after deletion
            this.loadAllEvents();
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Failed to delete event. Please try again.');
        }
    }

    downloadICS(id, name, description, address, date, time) {
        // Format date and time for ICS
        const [year, month, day] = date.split('-');
        const [hours, minutes] = time.split(':');
        const [timeValue, period, timezone] = time.split(' ');
        
        // Convert to 24-hour format
        let hour24 = parseInt(hours);
        if (period === 'PM' && hour24 !== 12) hour24 += 12;
        if (period === 'AM' && hour24 === 12) hour24 = 0;
        
        // Create ICS content
        const icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Support Group Search//Event Calendar//EN',
            'BEGIN:VEVENT',
            `DTSTART:${year}${month}${day}T${hour24.toString().padStart(2, '0')}${minutes}00`,
            `DTEND:${year}${month}${day}T${(hour24 + 1).toString().padStart(2, '0')}${minutes}00`,
            `SUMMARY:${name}`,
            `DESCRIPTION:${description}`,
            `LOCATION:${address}`,
            'END:VEVENT',
            'END:VCALENDAR'
        ].join('\r\n');

        // Create blob and download
        const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute('download', `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Initialize the filter when the DOM is loaded
let eventFilter;
document.addEventListener('DOMContentLoaded', () => {
    eventFilter = new EventFilter();
});

// Add filter toggle functionality
document.addEventListener('DOMContentLoaded', function() {
    const filterToggle = document.getElementById('filterToggle');
    const filterSection = document.getElementById('filterSection');

    filterToggle.addEventListener('click', function() {
        const isVisible = filterSection.style.display !== 'none';
        filterSection.style.display = isVisible ? 'none' : 'block';
        filterToggle.classList.toggle('active');
        filterToggle.textContent = isVisible ? 'Filters' : 'Hide Filters';
    });
}); 