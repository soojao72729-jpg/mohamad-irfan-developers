// UNLIMITED STORAGE (INDEXEDDB) HANDLER
const dbName = "NexusDB_V6";
const storeName = "properties";

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = e => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "id" });
            }
        };
        request.onsuccess = e => resolve(e.target.result);
        request.onerror = e => reject(e.target.error);
    });
}

// FIREBASE & STORAGE HANDLER
async function getD() {
    // Check if Firebase is initialized and connected
    if (typeof db !== 'undefined') {
        try {
            const snapshot = await propertiesRef.once('value');
            const data = snapshot.val();
            return data ? Object.values(data) : [];
        } catch (e) {
            console.warn("Firebase fetch failed, falling back to local storage", e);
        }
    }

    // Fallback to IndexedDB (for offline/local testing)
    const idb = await openDB();
    return new Promise((resolve) => {
        const transaction = idb.transaction(storeName, "readonly");
        const request = transaction.objectStore(storeName).getAll();
        request.onsuccess = () => resolve(request.result || []);
    });
}

async function renderProperties() {
    const list = document.getElementById('property-list');
    if (!list) return;

    // Filter values
    const keyword = document.getElementById('filter-keyword')?.value.toLowerCase() || '';
    const cityFilter = document.getElementById('filter-city')?.value || 'All';
    const catFilter = document.getElementById('filter-category')?.value || 'All';
    const priceFilter = document.getElementById('filter-price')?.value || 'Any';

    let properties = await getD();

    // Filter Logic
    properties = properties.filter(p => {
        const cityMatch = cityFilter === 'All' || p.city === cityFilter;
        const catMatch = catFilter === 'All' || p.category === catFilter;

        // Basic Price parsing (PKR)
        let priceMatch = true;
        if (priceFilter !== 'Any') {
            const rawPrice = p.price.toLowerCase().replace(/,/g, '');
            let numericPrice = parseFloat(rawPrice);
            if (rawPrice.includes('lac')) numericPrice *= 100000;
            if (rawPrice.includes('crore')) numericPrice *= 10000000;
            priceMatch = numericPrice <= parseFloat(priceFilter);
        }

        // Keyword Search
        const searchableText = `${p.title} ${p.area} ${p.stats.join(' ')}`.toLowerCase();
        const kwMatch = searchableText.includes(keyword);

        return cityMatch && catMatch && priceMatch && kwMatch;
    });

    list.innerHTML = '';

    if (properties.length === 0) {
        list.innerHTML = `<p style="text-align: center; color: var(--text-muted); grid-column: 1/-1; padding: 4rem;">
            Abhi is category ya shehar mein koi property nahi mili. <br> 
            <small onclick="location.reload()" style="color: var(--primary); cursor: pointer;">Sari properties wapis dekhne ke liye yahan click karein.</small>
        </p>`;
        return;
    }

    properties.forEach(prop => {
        const badgeClass = prop.category === 'Rent' ? 'badge-rent' :
            prop.category === 'Plot' || prop.category === 'Investment' ? 'badge-plot' :
                prop.category === 'Commercial' || prop.category === 'Plaza' ? 'badge-commercial' : '';

        const videoBtn = prop.youtube ? `
            <div class="btn-play" onclick="openVideoModal('${prop.youtube}')">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="white"><path d="M8 5v14l11-7z"/></svg>
            </div>` : '';

        const card = `
            <div class="property-card glass">
                <div class="category-badge ${badgeClass}">${prop.category}</div>
                <div style="position:relative;">
                    <img src="${prop.img}" alt="${prop.title}" class="property-img">
                    ${videoBtn}
                </div>
                <div class="property-info">
                    <div class="property-price">PKR ${prop.price}</div>
                    <span class="property-type-tag">${prop.category.toUpperCase()}</span>
                    <h3>${prop.title}</h3>
                    <p style="color: #94a3b8; font-size: 0.85rem; margin-bottom: 0.5rem;">
                        📍 ${prop.area}, ${prop.city}
                    </p>
                    <div class="property-stats">
                        ${prop.stats ? prop.stats.map(s => `<div class="stat-tag">${s}</div>`).join('') : ''}
                    </div>
                </div>
            </div>
        `;
        list.innerHTML += card;
    });

    applyRevealAnimation();
}

function applyRevealAnimation() {
    const observerOptions = { threshold: 0.1 };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    document.querySelectorAll('.property-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'all 0.6s ease-out';
        observer.observe(card);
    });
}

// UI Scroll effects
window.addEventListener('scroll', () => {
    const header = document.getElementById('main-header');
    if (header && window.scrollY > 50) header.classList.add('scrolled');
    else if (header) header.classList.remove('scrolled');
});

// REAL-TIME SYNC: Tabs check
window.addEventListener('storage', (e) => {
    if (e.key === 'nexus_idb_sync') {
        populateFilters();
        renderProperties();
    }
    if (e.key === 'nexus_office_data') updateOfficeSection();
    if (e.key === 'nexus_hcta_data') updateHeaderAction();
});

// FIREBASE REAL-TIME LISTENERS
if (typeof propertiesRef !== 'undefined') {
    propertiesRef.on('value', () => {
        populateFilters();
        renderProperties();
    });
    officeRef.on('value', (snap) => {
        const data = snap.val();
        if (data) {
            localStorage.setItem('nexus_office_data', JSON.stringify(data));
            updateOfficeSection();
        }
    });
    hctaRef.on('value', (snap) => {
        const data = snap.val();
        if (data) {
            localStorage.setItem('nexus_hcta_data', JSON.stringify(data));
            updateHeaderAction();
        }
    });
}

// HANDLE CONTACT FORM SUBMISSION
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const feedback = document.getElementById('form-feedback');
        const inquiryData = {
            id: Date.now(),
            name: document.getElementById('user-name').value,
            email: document.getElementById('user-email').value,
            phone: document.getElementById('user-phone').value,
            message: document.getElementById('user-message').value,
            time: new Date().toLocaleString()
        };

        const currentInquiries = JSON.parse(localStorage.getItem('nexus_inquiries')) || [];
        currentInquiries.push(inquiryData);
        localStorage.setItem('nexus_inquiries', JSON.stringify(currentInquiries));

        // Sync to Firebase if available
        if (typeof inquiriesRef !== 'undefined') {
            inquiriesRef.push(inquiryData);
        }

        // Show feedback
        feedback.innerText = "Mubarak ho! Aapka pegham hamy mil gaya hai.";
        feedback.style.display = "block";
        contactForm.reset();

        setTimeout(() => { feedback.style.display = "none"; }, 5000);
    });
}

// HANDLE OFFICE DATA LOAD
function updateOfficeSection() {
    const data = JSON.parse(localStorage.getItem('nexus_office_data'));
    const section = document.getElementById('about');
    if (data && section) {
        section.style.display = 'grid';
        if (data.title) document.getElementById('office-title').innerHTML = data.title;
        if (data.desc) document.getElementById('office-desc').innerHTML = data.desc.replace(/\n/g, '<br>');
        if (data.img) document.getElementById('office-img').src = data.img;
    } else if (section) {
        section.style.display = 'none';
    }
}

// HANDLE HEADER CTA LOAD
function updateHeaderAction() {
    const data = JSON.parse(localStorage.getItem('nexus_hcta_data'));
    const container = document.getElementById('header-action-container');
    if (!container) return;

    if (data && data.active && data.img) {
        container.innerHTML = `<a href="${data.link || '#contact'}">
            <img src="${data.img}" style="max-height: 50px; border-radius: 8px; cursor: pointer; transition: 0.3s;" 
                 onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        </a>`;
    } else {
        container.innerHTML = `<a href="#contact" class="btn btn-primary">Book Viewing</a>`;
    }
}

// DYNAMIC FILTER POPULATION
async function populateFilters() {
    const properties = await getD();
    const citySelect = document.getElementById('filter-city');
    const catSelect = document.getElementById('filter-category');

    if (!citySelect || !catSelect) return;

    // Save current selections
    const currentCity = citySelect.value;
    const currentCat = catSelect.value;

    const cities = [...new Set(properties.map(p => p.city))].sort();
    const categories = [...new Set(properties.map(p => p.category))].sort();

    citySelect.innerHTML = '<option value="All">All Cities</option>';
    cities.forEach(c => citySelect.innerHTML += `<option>${c}</option>`);
    citySelect.value = cities.includes(currentCity) ? currentCity : 'All';

    catSelect.innerHTML = '<option value="All">All Types</option>';
    categories.forEach(c => catSelect.innerHTML += `<option>${c}</option>`);
    catSelect.value = categories.includes(currentCat) ? currentCat : 'All';
}

// VIDEO MODAL LOGIC
function openVideoModal(url) {
    const modal = document.getElementById('video-modal');
    const container = document.getElementById('video-container');

    // Extract ID from different YT formats
    let videoId = '';
    if (url.includes('v=')) videoId = url.split('v=')[1].split('&')[0];
    else if (url.includes('be/')) videoId = url.split('be/')[1].split('?')[0];

    if (videoId) {
        container.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    } else {
        alert("Invalid YouTube Link!");
    }
}

function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const container = document.getElementById('video-container');
    modal.style.display = 'none';
    container.innerHTML = '';
    document.body.style.overflow = 'auto';
}

// ADMIN ACCESS SECURITY
function goToAdmin() {
    const correctPass = localStorage.getItem('nexus_admin_pass') || 'irfan admin';
    const userPass = prompt("Admin Panel Access karne ke liye Password likhein:");

    if (userPass === correctPass) {
        sessionStorage.setItem('nexus_admin_logged', 'true');
        window.location.href = 'admin.html';
    } else if (userPass !== null) {
        alert("Ghalat Password! Aap access nahi kar sakte.");
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    await populateFilters();
    await renderProperties();
    updateOfficeSection();
    updateHeaderAction();
});
