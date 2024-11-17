import { auth, db } from '../firebase/config.js';
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let tutorData = null;
let currentUser = null;
let precioBase = 0;
let duracionSeleccionada = 60;

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tutorId = urlParams.get('id');

    if (!tutorId) {
        mostrarError('No se encontró el tutor especificado');
        return;
    }

    try {
        await cargarDatosTutor(tutorId);
        inicializarEventListeners();
        actualizarPrecioTotal();
    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar los datos del tutor');
    }
});

async function cargarDatosTutor(tutorId) {
    try {
        mostrarCargando(true);
        const tutorRef = doc(db, 'usuarios', tutorId);
        const tutorSnap = await getDoc(tutorRef);

        if (!tutorSnap.exists()) {
            throw new Error('Tutor no encontrado');
        }

        tutorData = tutorSnap.data();
        precioBase = tutorData.precioHora || 35;
        renderizarDatosTutor();
        
    } catch (error) {
        console.error('Error al cargar datos:', error);
        throw error;
    } finally {
        mostrarCargando(false);
    }
}

function renderizarDatosTutor() {
    // Información básica
    document.getElementById('tutorNombre').textContent = tutorData.nombre || 'Nombre no disponible';
    document.getElementById('tutorImage').src = tutorData.foto || '../recursos/imagenes/default-profile.png';
    document.getElementById('tutorDescripcion').textContent = tutorData.descripcion || 'Sin descripción disponible';

    // Estadísticas
    document.querySelector('.rating-value').textContent = tutorData.calificacion?.toFixed(1) || '0.0';
    document.querySelector('.classes-value').textContent = `${tutorData.clasesImpartidas || '0'}+`;
    document.querySelector('.students-value').textContent = `${tutorData.estudiantes?.length || '0'}+`;

    // Credenciales
    document.querySelector('.education-value').textContent = tutorData.formacion || 'No especificada';
    document.querySelector('.experience-value').textContent = `${tutorData.experiencia || '0'} años como tutor`;

    // Precio
    document.getElementById('tutorPrecio').textContent = precioBase;
    actualizarPrecioTotal();

    // Materias
    renderizarMaterias();
}

function renderizarMaterias() {
    const materiasContainer = document.querySelector('.subjects-list');
    if (!materiasContainer) return;

    if (!tutorData.materias || tutorData.materias.length === 0) {
        materiasContainer.innerHTML = '<p>No hay materias registradas</p>';
        return;
    }

    materiasContainer.innerHTML = tutorData.materias.map(materia => `
        <div class="subject-item">
            <span class="subject-icon">📚</span>
            <div class="subject-content">
                <h3>${materia}</h3>
                <div class="level-tags">
                    <span class="level-tag">Básico</span>
                    <span class="level-tag">Intermedio</span>
                    <span class="level-tag">Avanzado</span>
                </div>
            </div>
        </div>
    `).join('');
}

function inicializarEventListeners() {
    // Botones de duración
    document.querySelectorAll('.duration-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.duration-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            duracionSeleccionada = parseInt(btn.dataset.duration);
            actualizarPrecioTotal();
        });
    });

    // Botones de tipo de clase
    document.querySelectorAll('.class-type-option').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.class-type-option').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });

    // Formulario de reserva
    const formReserva = document.getElementById('formReserva');
    if (formReserva) {
        formReserva.addEventListener('submit', handleReserva);
    }

    // Selector de fecha
    const dateSelect = document.getElementById('dateSelect');
    if (dateSelect) {
        const hoy = new Date().toISOString().split('T')[0];
        dateSelect.min = hoy;
        dateSelect.addEventListener('change', () => {
            actualizarHorariosDisponibles(dateSelect.value);
        });
    }
}

function actualizarPrecioTotal() {
    const precioTotal = (precioBase * duracionSeleccionada) / 60;
    document.getElementById('totalPrice').textContent = `$${precioTotal.toFixed(2)}`;
}

function actualizarHorariosDisponibles(fecha) {
    const timeSelect = document.getElementById('timeSelect');
    if (!timeSelect) return;

    // Limpiar opciones actuales
    timeSelect.innerHTML = '<option value="">Selecciona un horario</option>';

    // Obtener horarios disponibles para la fecha seleccionada
    const horariosDisponibles = obtenerHorariosDisponibles(fecha);

    // Agregar horarios al select
    horariosDisponibles.forEach(horario => {
        const option = document.createElement('option');
        option.value = horario;
        option.textContent = horario;
        timeSelect.appendChild(option);
    });
}

function obtenerHorariosDisponibles(fecha) {
    // Aquí podrías obtener los horarios desde Firebase
    // Por ahora retornamos horarios de ejemplo
    return [
        '09:00',
        '10:00',
        '11:00',
        '14:00',
        '15:00',
        '16:00'
    ];
}

async function handleReserva(e) {
    e.preventDefault();
    
    if (!currentUser) {
        mostrarError('Debes iniciar sesión para reservar una clase');
        window.location.href = 'login.html';
        return;
    }

    const fecha = document.getElementById('dateSelect').value;
    const horario = document.getElementById('timeSelect').value;
    const tipoClase = document.querySelector('.class-type-option.active').dataset.type;

    if (!fecha || !horario) {
        mostrarError('Por favor selecciona fecha y horario');
        return;
    }

    try {
        mostrarCargando(true);
        
        // Crear objeto de reserva
        const reservaData = {
            tutorId: tutorData.id,
            estudianteId: currentUser.uid,
            fecha: fecha,
            hora: horario,
            duracion: duracionSeleccionada,
            tipo: tipoClase,
            precio: (precioBase * duracionSeleccionada) / 60,
            estado: 'pendiente',
            fechaCreacion: new Date().toISOString()
        };

        // Aquí irían las validaciones adicionales y la lógica de guardado en Firebase

        mostrarExito('Reserva realizada con éxito');
        setTimeout(() => {
            window.location.href = 'mis-reservas.html';
        }, 2000);

    } catch (error) {
        console.error('Error al realizar la reserva:', error);
        mostrarError('Error al procesar la reserva');
    } finally {
        mostrarCargando(false);
    }
}

// Funciones de UI
function mostrarCargando(show) {
    // Implementar loader visual
    const loader = document.createElement('div');
    loader.className = 'loader';
    if (show) {
        document.body.appendChild(loader);
    } else {
        const existingLoader = document.querySelector('.loader');
        if (existingLoader) {
            existingLoader.remove();
        }
    }
}

function mostrarError(mensaje) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = mensaje;

    // Remover mensaje de error anterior si existe
    const errorExistente = document.querySelector('.error-message');
    if (errorExistente) {
        errorExistente.remove();
    }

    document.querySelector('.perfil-container').prepend(errorDiv);
    setTimeout(() => errorDiv.remove(), 5000);
}

function mostrarExito(mensaje) {
    const exitoDiv = document.createElement('div');
    exitoDiv.className = 'success-message';
    exitoDiv.textContent = mensaje;

    // Remover mensaje de éxito anterior si existe
    const exitoExistente = document.querySelector('.success-message');
    if (exitoExistente) {
        exitoExistente.remove();
    }

    document.querySelector('.perfil-container').prepend(exitoDiv);
    setTimeout(() => exitoDiv.remove(), 5000);
}

// Verificación de autenticación
auth.onAuthStateChanged((user) => {
    currentUser = user;
    actualizarUIUsuario();
});

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

// Exportar funciones necesarias
window.cerrarSesion = async () => {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
    }
};

// Utilidades
function formatearFecha(fecha) {
    if (!fecha) return '';
    return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Inicializar tooltips y otros componentes UI
function inicializarComponentesUI() {
    // Aquí puedes inicializar componentes adicionales de UI si los necesitas
}