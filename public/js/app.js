cat > public/js/app.js << 'EOF'
let currentUserId = null;
let allWishes = [];
let allUsers = [];
let categories = [];

// DOM Elements
const usersListDiv = document.getElementById('usersList');
const wishesGridDiv = document.getElementById('wishesGrid');
const categoryFilter = document.getElementById('categoryFilter');
const statusFilter = document.getElementById('statusFilter');
const statsCards = document.getElementById('statsCards');
const greetingMessage = document.getElementById('greetingMessage');
const dateTimeEl = document.getElementById('dateTime');
const addUserBtn = document.getElementById('addUserBtn');
const addWishBtn = document.getElementById('addWishBtn');
const userModal = document.getElementById('userModal');
const wishModal = document.getElementById('wishModal');
const userForm = document.getElementById('userForm');
const wishForm = document.getElementById('wishForm');
const deleteWishBtn = document.getElementById('deleteWishBtn');
const wishCategorySelect = document.getElementById('wishCategory');

// Update date and time
function updateDateTime() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
    if (dateTimeEl) dateTimeEl.innerHTML = now.toLocaleDateString('ru-RU', options);
}
setInterval(updateDateTime, 1000);
updateDateTime();

// Greeting based on time
function updateGreeting() {
    const hour = new Date().getHours();
    let greeting = '';
    if (hour < 12) greeting = 'Доброе утро';
    else if (hour < 18) greeting = 'Добрый день';
    else greeting = 'Добрый вечер';
    if (greetingMessage) greetingMessage.innerHTML = `${greeting}! 🎁`;
}
updateGreeting();

// Load categories
async function loadCategories() {
    try {
        const res = await fetch('/api/categories');
        categories = await res.json();
        
        if (categoryFilter) {
            categoryFilter.innerHTML = '<option value="all">📁 Все категории</option>' + 
                categories.map(cat => `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`).join('');
        }
        
        if (wishCategorySelect) {
            wishCategorySelect.innerHTML = categories.map(cat => 
                `<option value="${cat.id}">${cat.icon} ${cat.name}</option>`
            ).join('');
        }
    } catch (error) {
        console.error('Error loading categories:', error);
    }
}

// Load users
async function loadUsers() {
    try {
        const res = await fetch('/api/users');
        allUsers = await res.json();
        renderUsers();
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Load wishes
async function loadWishes() {
    try {
        let url = '/api/wishes';
        const params = [];
        
        if (currentUserId) params.push(`userId=${currentUserId}`);
        if (categoryFilter && categoryFilter.value !== 'all') params.push(`category=${categoryFilter.value}`);
        if (statusFilter && statusFilter.value !== 'all') params.push(`status=${statusFilter.value}`);
        
        if (params.length) url += '?' + params.join('&');
        
        const res = await fetch(url);
        allWishes = await res.json();
        renderWishes();
    } catch (error) {
        console.error('Error loading wishes:', error);
    }
}

// Load stats
async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        const stats = await res.json();
        renderStats(stats);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Render users
function renderUsers() {
    if (!usersListDiv) return;
    
    if (allUsers.length === 0) {
        usersListDiv.innerHTML = '<div class="loading-spinner">Нет пользователей</div>';
        return;
    }
    
    usersListDiv.innerHTML = allUsers.map(user => `
        <div class="user-card ${currentUserId === user.id ? 'active' : ''}" data-id="${user.id}">
            <div class="user-avatar">${user.avatar || '👤'}</div>
            <div class="user-info">
                <div class="user-name">${escapeHtml(user.name)}</div>
                <div class="user-email">${escapeHtml(user.email)}</div>
            </div>
            <div class="user-stats">📦 ${allWishes.filter(w => w.userId === user.id).length}</div>
        </div>
    `).join('');
    
    document.querySelectorAll('.user-card').forEach(card => {
        card.addEventListener('click', () => {
            currentUserId = parseInt(card.dataset.id);
            loadUsers();
            loadWishes();
            updateTitle();
        });
    });
}

// Render wishes
function renderWishes() {
    if (!wishesGridDiv) return;
    
    if (allWishes.length === 0) {
        wishesGridDiv.innerHTML = '<div class="loading-spinner">😴 Нет желаний. Добавьте что-нибудь!</div>';
        return;
    }
    
    wishesGridDiv.innerHTML = allWishes.map(wish => `
        <div class="wish-card priority-${wish.priority} ${wish.status === 'completed' ? 'completed' : ''}" data-id="${wish.id}">
            ${wish.image ? `<img src="${wish.image}" class="wish-image" onerror="this.style.display='none'">` : ''}
            <div class="wish-content">
                <div class="wish-header">
                    <span class="wish-title">${escapeHtml(wish.title)}</span>
                    <span class="wish-price">${wish.price ? wish.price.toLocaleString() + ' ₽' : 'Цена не указана'}</span>
                </div>
                ${wish.description ? `<div class="wish-desc">${escapeHtml(wish.description)}</div>` : ''}
                <div class="wish-meta">
                    <span class="wish-category">${wish.categoryData?.icon || '🎁'} ${wish.categoryData?.name || wish.category}</span>
                    ${!currentUserId ? `<span class="wish-user">👤 ${wish.user?.name || '???'}</span>` : ''}
                    <span>${wish.priority === 'high' ? '🔴 Высокий' : wish.priority === 'medium' ? '🟡 Средний' : '🟢 Низкий'}</span>
                </div>
                <div class="wish-actions">
                    ${wish.status !== 'completed' ? `<button class="btn-complete" data-id="${wish.id}">✅ Выполнить</button>` : ''}
                    <button class="btn-edit" data-id="${wish.id}">✏️ Редактировать</button>
                </div>
            </div>
        </div>
    `).join('');
    
    document.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            await toggleComplete(id);
        });
    });
    
    document.querySelectorAll('.btn-edit').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = parseInt(btn.dataset.id);
            openEditWishModal(id);
        });
    });
}

// Render stats
function renderStats(stats) {
    if (!statsCards) return;
    
    statsCards.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Всего желаний</div>
            <div class="stat-value">${stats.totalWishes}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Выполнено</div>
            <div class="stat-value">${stats.completedWishes} (${stats.completionRate}%)</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Общая сумма</div>
            <div class="stat-value">${stats.totalPrice.toLocaleString()} ₽</div>
        </div>
    `;
}

// Update title
function updateTitle() {
    const wishesTitle = document.getElementById('wishesTitle');
    if (!wishesTitle) return;
    
    if (currentUserId) {
        const user = allUsers.find(u => u.id === currentUserId);
        wishesTitle.innerHTML = `✨ Желания: ${user ? user.name : 'Пользователь'}`;
    } else {
        wishesTitle.innerHTML = `✨ Все желания`;
    }
}

// Toggle complete status
async function toggleComplete(wishId) {
    const wish = allWishes.find(w => w.id === wishId);
    if (!wish) return;
    
    await fetch(`/api/wishes/${wishId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: wish.status === 'completed' ? 'pending' : 'completed' })
    });
    
    await loadWishes();
    await loadStats();
    await loadUsers();
}

// Open edit wish modal
async function openEditWishModal(wishId) {
    const wish = allWishes.find(w => w.id === wishId);
    if (!wish) return;
    
    document.getElementById('wishModalTitle').innerHTML = '<i class="fas fa-edit"></i> Редактировать желание';
    document.getElementById('wishId').value = wish.id;
    document.getElementById('wishTitle').value = wish.title;
    document.getElementById('wishDesc').value = wish.description || '';
    document.getElementById('wishPrice').value = wish.price || '';
    document.getElementById('wishPriority').value = wish.priority;
    document.getElementById('wishCategory').value = wish.category;
    document.getElementById('wishStatus').value = wish.status;
    document.getElementById('wishLink').value = wish.link || '';
    document.getElementById('wishImage').value = wish.image || '';
    deleteWishBtn.style.display = 'block';
    wishModal.style.display = 'block';
}

// Escape HTML
function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// Event Listeners
if (addUserBtn) {
    addUserBtn.onclick = () => {
        document.getElementById('userModal').style.display = 'block';
    };
}

if (addWishBtn) {
    addWishBtn.onclick = () => {
        if (!currentUserId) {
            alert('⚠️ Сначала выберите пользователя!');
            return;
        }
        document.getElementById('wishModalTitle').innerHTML = '<i class="fas fa-star"></i> Новое желание';
        document.getElementById('wishId').value = '';
        document.getElementById('wishTitle').value = '';
        document.getElementById('wishDesc').value = '';
        document.getElementById('wishPrice').value = '';
        document.getElementById('wishPriority').value = 'medium';
        document.getElementById('wishStatus').value = 'pending';
        document.getElementById('wishLink').value = '';
        document.getElementById('wishImage').value = '';
        deleteWishBtn.style.display = 'none';
        wishModal.style.display = 'block';
    };
}

// Close modals
document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.onclick = () => {
        document.getElementById('userModal').style.display = 'none';
        document.getElementById('wishModal').style.display = 'none';
    };
});

window.onclick = (event) => {
    if (event.target === document.getElementById('userModal')) {
        document.getElementById('userModal').style.display = 'none';
    }
    if (event.target === document.getElementById('wishModal')) {
        document.getElementById('wishModal').style.display = 'none';
    }
};

// User form submit
if (userForm) {
    userForm.onsubmit = async (e) => {
        e.preventDefault();
        const name = document.getElementById('userName').value;
        const email = document.getElementById('userEmail').value;
        const avatar = document.getElementById('userAvatar').value;
        
        if (!name || !email) {
            alert('Заполните имя и email!');
            return;
        }
        
        await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, avatar })
        });
        
        document.getElementById('userModal').style.display = 'none';
        userForm.reset();
        await loadUsers();
        await loadStats();
    };
}

// Wish form submit
if (wishForm) {
    wishForm.onsubmit = async (e) => {
        e.preventDefault();
        const id = document.getElementById('wishId').value;
        const title = document.getElementById('wishTitle').value;
        const description = document.getElementById('wishDesc').value;
        const price = document.getElementById('wishPrice').value;
        const priority = document.getElementById('wishPriority').value;
        const category = document.getElementById('wishCategory').value;
        const status = document.getElementById('wishStatus').value;
        const link = document.getElementById('wishLink').value;
        const image = document.getElementById('wishImage').value;
        
        if (!title) {
            alert('Введите название желания!');
            return;
        }
        
        const wishData = { title, description, price, priority, category, status, link, image };
        
        if (id) {
            await fetch(`/api/wishes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(wishData)
            });
        } else {
            await fetch('/api/wishes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId, ...wishData })
            });
        }
        
        document.getElementById('wishModal').style.display = 'none';
        wishForm.reset();
        await loadWishes();
        await loadStats();
        await loadUsers();
    };
}

// Delete wish
if (deleteWishBtn) {
    deleteWishBtn.onclick = async () => {
        const id = document.getElementById('wishId').value;
        if (!confirm('Удалить это желание?')) return;
        
        await fetch(`/api/wishes/${id}`, { method: 'DELETE' });
        document.getElementById('wishModal').style.display = 'none';
        await loadWishes();
        await loadStats();
        await loadUsers();
    };
}

// Filter listeners
if (categoryFilter) {
    categoryFilter.onchange = () => {
        loadWishes();
    };
}

if (statusFilter) {
    statusFilter.onchange = () => {
        loadWishes();
    };
}

// Initialize
async function init() {
    await loadCategories();
    await loadUsers();
    await loadWishes();
    await loadStats();
}

init();
EOF