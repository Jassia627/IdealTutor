// Importar configuración de Firebase
import { auth, db } from '../firebase/config.js';

// Estado de la aplicación
let currentUser = null;
let tutoresDestacados = [];
let testimonios = [];

// Elementos DOM
const btnLogin = document.getElementById('btnLogin');
const btnRegister = document.getElementById('btnRegister');
const tutoresGrid = document.getElementById('tutoresDestacados');
const testimoniosSlider = document.getElementById('testimoniosSlider');

// Event Listeners
document.addEventListener('DOMContentLoaded', inicializarApp);
if(btnLogin) btnLogin.addEventListener('click', mostrarModalLogin);
if(btnRegister) btnRegister.addEventListener('click', mostrarModalRegistro);

// Función principal de inicialización
async function inicializarApp() {
    // Observador de estado de autenticación
    auth.onAuthStateChanged(handleAuthStateChanged);
    
    // Cargar datos iniciales
    await Promise.all([
        cargarTutoresDestacados(),
        cargarTestimonios()
    ]);
}

// Manejador de estado de autenticación
function handleAuthStateChanged(user) {
    currentUser = user;
    actualizarUI();
}

// Funciones de UI
function actualizarUI() {
    const authButtons = document.querySelector('.auth-buttons');
    
    if (currentUser) {
        // Usuario autenticado
        if (authButtons) {
            authButtons.innerHTML = `
                <span>Bienvenido, ${currentUser.email}</span>
                <button onclick="cerrarSesion()" class="btn-login">Cerrar Sesión</button>
            `;
        }
    } else {
        // Usuario no autenticado
        if (authButtons) {
            authButtons.innerHTML = `
                <button id="btnLogin" class="btn-login">Iniciar Sesión</button>
                <button id="btnRegister" class="btn-register">Registrarse</button>
            `;
        }
    }
}

// Funciones de Firestore
async function cargarTutoresDestacados() {
    try {
        const snapshot = await db.collection('tutores')
            .where('destacado', '==', true)
            .limit(6)
            .get();

        tutoresDestacados = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderizarTutores();
    } catch (error) {
        console.error('Error al cargar tutores:', error);
    }
}

async function cargarTestimonios() {
    try {
        const snapshot = await db.collection('testimonios')
            .limit(5)
            .get();

        testimonios = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        renderizarTestimonios();
    } catch (error) {
        console.error('Error al cargar testimonios:', error);
    }
}

// Funciones de renderizado
function renderizarTutores() {
    if (!tutoresGrid) return;

    tutoresGrid.innerHTML = tutoresDestacados.map(tutor => `
        <div class="tutor-card">
            <img src="${tutor.foto || 'recursos/imagenes/default-profile.png'}" alt="${tutor.nombre}">
            <h3>${tutor.nombre}</h3>
            <p>${tutor.especialidad}</p>
            <div class="tutor-rating">
                ${'⭐'.repeat(tutor.calificacion)}
                <span>(${tutor.numResenas} reseñas)</span>
            </div>
            <button onclick="verPerfilTutor('${tutor.id}')" class="btn-primary">
                Ver Perfil
            </button>
        </div>
    `).join('');
}

function renderizarTestimonios() {
    if (!testimoniosSlider) return;

    testimoniosSlider.innerHTML = testimonios.map(testimonio => `
        <div class="testimonio-card">
            <p class="testimonio-texto">"${testimonio.texto}"</p>
            <div class="testimonio-autor">
                <img src="${testimonio.foto || 'recursos/imagenes/default-profile.png'}" 
                     alt="${testimonio.autor}">
                <div>
                    <h4>${testimonio.autor}</h4>
                    <p>${testimonio.curso}</p>
                </div>
            </div>
        </div>
    `).join('');
}

// Funciones de autenticación
function mostrarModalLogin() {
    // Implementar modal de login
    console.log('Mostrar modal de login');
}

function mostrarModalRegistro() {
    // Implementar modal de registro
    console.log('Mostrar modal de registro');
}

async function cerrarSesion() {
    try {
        await auth.signOut();
        window.location.reload();
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
}

// Funciones de navegación
function verPerfilTutor(tutorId) {
    window.location.href = `servicios.html?tutor=${tutorId}`;
}

// Exportar funciones necesarias
window.cerrarSesion = cerrarSesion;
window.verPerfilTutor = verPerfilTutor;