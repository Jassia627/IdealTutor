import { auth, db } from '../firebase/config.js';
import { collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

let currentUser = null;

// Inicialización
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Inicializando página de servicios...');
    verificarAutenticacion();
    await cargarTutores();
    inicializarFiltros();
});

// Verificar autenticación
function verificarAutenticacion() {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
        actualizarUIUsuario();
    });
}

// Cargar tutores
async function cargarTutores() {
    try {
        mostrarCargando(true);
        console.log('Cargando tutores...');
        
        const tutoresRef = collection(db, 'usuarios');
        const q = query(tutoresRef, where('tipo', '==', 'tutor'));
        const querySnapshot = await getDocs(q);
        
        const tutores = [];
        querySnapshot.forEach((doc) => {
            tutores.push({ id: doc.id, ...doc.data() });
        });

        console.log('Tutores cargados:', tutores.length);
        renderizarTutores(tutores);
        
    } catch (error) {
        console.error('Error al cargar tutores:', error);
        mostrarError('Error al cargar los tutores');
    } finally {
        mostrarCargando(false);
    }
}

// Renderizar tutores
function renderizarTutores(tutores) {
    const tutoresGrid = document.getElementById('tutoresGrid');
    if (!tutoresGrid) return;

    tutoresGrid.innerHTML = '';

    if (tutores.length === 0) {
        tutoresGrid.innerHTML = `
            <div class="no-results">
                <p>No se encontraron tutores disponibles</p>
            </div>
        `;
        return;
    }

    tutores.forEach(tutor => {
        const tutorCard = createTutorCard(tutor);
        tutoresGrid.appendChild(tutorCard);
    });

    // Actualizar contador
    const tutorCount = document.getElementById('tutorCount');
    if (tutorCount) {
        tutorCount.textContent = tutores.length;
    }
}

// Crear tarjeta de tutor
function createTutorCard(tutor) {
    const card = document.createElement('div');
    card.className = 'tutor-card';
    
    card.innerHTML = `
        <div class="tutor-card-header">
            <div class="tutor-avatar">
                <img src="${tutor.foto || '../recursos/imagenes/default-profile.png'}" 
                     alt="${tutor.nombre}">
                <span class="online-status ${tutor.activo ? 'online' : ''}"></span>
            </div>
            <div class="tutor-basic-info">
                <h3 class="tutor-name">${tutor.nombre}</h3>
                <p class="tutor-specialty">${tutor.especialidad || 'Tutor'}</p>
            </div>
        </div>
        
        <div class="tutor-card-body">
            <div class="tutor-stats">
                <div class="stat">
                    <span class="stat-value">${tutor.calificacion?.toFixed(1) || '0.0'}</span>
                    <span class="stat-label">⭐ Rating</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${tutor.clasesImpartidas || '0'}</span>
                    <span class="stat-label">📚 Clases</span>
                </div>
                <div class="stat">
                    <span class="stat-value">${tutor.estudiantes?.length || '0'}</span>
                    <span class="stat-label">👥 Estudiantes</span>
                </div>
            </div>
            
            <div class="tutor-subjects">
                ${(tutor.materias || []).map(materia => 
                    `<span class="subject-tag">${materia}</span>`
                ).join('')}
            </div>
            
            <div class="tutor-availability">
                <p>Próxima disponibilidad:</p>
                <div class="availability-slots">
                    ${generarHorariosDisponibles(tutor.horarios)}
                </div>
            </div>
        </div>
        
        <div class="tutor-card-footer">
            <div class="price">
                <span class="amount">$${tutor.precioHora || '0'}</span>
                <span class="period">/hora</span>
            </div>
            <div class="action-buttons">
                <button class="btn-secondary btn-contact" 
                        onclick="contactarTutor('${tutor.id}')">
                    Contactar
                </button>
                <button class="btn-primary btn-book" 
                        onclick="verPerfilTutor('${tutor.id}')">
                    Ver Perfil
                </button>
            </div>
        </div>
    `;

    return card;
}

// Generar horarios disponibles
function generarHorariosDisponibles(horarios) {
    if (!horarios || horarios.length === 0) {
        return '<span class="time-slot">No hay horarios disponibles</span>';
    }

    return horarios.slice(0, 3).map(horario => 
        `<span class="time-slot available">${horario}</span>`
    ).join('');
}

// Inicializar filtros
function inicializarFiltros() {
    const searchInput = document.getElementById('searchInput');
    const filterButtons = document.querySelectorAll('.filter-pill');
    
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            aplicarFiltros();
        });
    }

    filterButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            aplicarFiltros();
        });
    });

    // Inicializar otros filtros
    ['nivelFilter', 'precioFilter', 'disponibilidadFilter', 'modalidadFilter'].forEach(filterId => {
        const filterElement = document.getElementById(filterId);
        if (filterElement) {
            filterElement.addEventListener('change', aplicarFiltros);
        }
    });
}

// Aplicar filtros
async function aplicarFiltros() {
    // Obtener valores de los filtros
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase();
    const materiaActiva = document.querySelector('.filter-pill.active')?.textContent;
    const nivel = document.getElementById('nivelFilter')?.value;
    const precio = document.getElementById('precioFilter')?.value;
    const disponibilidad = document.getElementById('disponibilidadFilter')?.value;
    const modalidad = document.getElementById('modalidadFilter')?.value;

    try {
        mostrarCargando(true);
        
        // Obtener todos los tutores
        const tutoresRef = collection(db, 'usuarios');
        const q = query(tutoresRef, where('tipo', '==', 'tutor'));
        const querySnapshot = await getDocs(q);
        
        let tutores = [];
        querySnapshot.forEach((doc) => {
            tutores.push({ id: doc.id, ...doc.data() });
        });

        // Aplicar filtros
        tutores = tutores.filter(tutor => {
            // Búsqueda por término
            if (searchTerm && !tutor.nombre.toLowerCase().includes(searchTerm) && 
                !tutor.materias?.some(m => m.toLowerCase().includes(searchTerm))) {
                return false;
            }

            // Filtro por materia
            if (materiaActiva && materiaActiva !== 'Todos' && 
                !tutor.materias?.includes(materiaActiva)) {
                return false;
            }

            // Filtro por nivel
            if (nivel && !tutor.niveles?.includes(nivel)) {
                return false;
            }

            // Filtro por precio
            if (precio) {
                const [min, max] = precio.split('-').map(Number);
                if (max) {
                    if (tutor.precioHora < min || tutor.precioHora > max) return false;
                } else {
                    if (tutor.precioHora < min) return false;
                }
            }

            // Filtro por disponibilidad
            if (disponibilidad && !tutor.disponibilidad?.includes(disponibilidad)) {
                return false;
            }

            // Filtro por modalidad
            if (modalidad && !tutor.modalidades?.includes(modalidad)) {
                return false;
            }

            return true;
        });

        renderizarTutores(tutores);
        
    } catch (error) {
        console.error('Error al aplicar filtros:', error);
        mostrarError('Error al filtrar tutores');
    } finally {
        mostrarCargando(false);
    }
}

// Funciones de utilidad
function mostrarCargando(show) {
    const loadingSkeleton = document.querySelector('.loading-skeleton');
    if (loadingSkeleton) {
        loadingSkeleton.style.display = show ? 'grid' : 'none';
    }
}

function mostrarError(mensaje) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = mensaje;
    
    const container = document.querySelector('.results-section');
    if (container) {
        container.insertBefore(errorDiv, container.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }
}

function actualizarUIUsuario() {
    const userArea = document.getElementById('userArea');
    if (!userArea) return;

    if (currentUser) {
        userArea.innerHTML = `
            <div class="user-info">
                <span>${currentUser.email}</span>
                <button onclick="cerrarSesion()" class="btn-logout">Cerrar Sesión</button>
            </div>
        `;
    } else {
        userArea.innerHTML = `
            <button onclick="location.href='login.html'" class="btn-login">Iniciar Sesión</button>
            <button onclick="location.href='registro.html'" class="btn-register">Registrarse</button>
        `;
    }
}

// Funciones de navegación
function verPerfilTutor(tutorId) {
    window.location.href = `perfil-tutor.html?id=${tutorId}`;
}

function contactarTutor(tutorId) {
    // Implementar lógica de contacto
    console.log('Contactando tutor:', tutorId);
}

// Exportar funciones necesarias
window.verPerfilTutor = verPerfilTutor;
window.contactarTutor = contactarTutor;
window.cerrarSesion = async () => {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
};