import { auth, db } from '../firebase/config.js';
import { 
    collection, 
    query, 
    where, 
    getDocs,
    doc,
    updateDoc,
    orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let reservas = [];

document.addEventListener('DOMContentLoaded', () => {
    verificarAutenticacion();
    inicializarEventListeners();
});

// Verificación de autenticación
function verificarAutenticacion() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await cargarReservas();
            actualizarUIUsuario();
        } else {
            window.location.href = 'login.html';
        }
    });
}

// Inicialización de listeners
function inicializarEventListeners() {
    // Filtros
    const filtroEstado = document.getElementById('filtroEstado');
    const filtroFecha = document.getElementById('filtroFecha');
    const busquedaInput = document.getElementById('busquedaReserva');

    if (filtroEstado) filtroEstado.addEventListener('change', aplicarFiltros);
    if (filtroFecha) filtroFecha.addEventListener('change', aplicarFiltros);
    if (busquedaInput) busquedaInput.addEventListener('input', aplicarFiltros);
}

// Cargar reservas
async function cargarReservas() {
    try {
        mostrarCargando(true);

        const reservasRef = collection(db, 'reservas');
        const q = query(
            reservasRef,
            where('estudianteId', '==', currentUser.uid),
            orderBy('fecha', 'desc')
        );

        const snapshot = await getDocs(q);
        reservas = await Promise.all(snapshot.docs.map(async doc => {
            const reserva = { id: doc.id, ...doc.data() };
            // Obtener datos del tutor
            const tutorDoc = await getDocs(doc(db, 'usuarios', reserva.tutorId));
            reserva.tutor = tutorDoc.data();
            return reserva;
        }));

        renderizarReservas(reservas);
    } catch (error) {
        console.error('Error al cargar reservas:', error);
        mostrarError('Error al cargar las reservas');
    } finally {
        mostrarCargando(false);
    }
}

// Renderizar reservas
function renderizarReservas(reservasFiltradas) {
    const container = document.getElementById('reservasContainer');
    if (!container) return;

    if (reservasFiltradas.length === 0) {
        container.innerHTML = '<div class="no-reservas">No se encontraron reservas</div>';
        return;
    }

    container.innerHTML = reservasFiltradas.map(reserva => `
        <div class="reserva-card">
            <div class="reserva-header">
                <div class="tutor-info">
                    <img src="${reserva.tutor.foto || '../recursos/imagenes/default-profile.png'}" 
                         alt="${reserva.tutor.nombre}"
                         class="tutor-foto">
                    <div class="tutor-detalles">
                        <h3>${reserva.tutor.nombre}</h3>
                        <span class="materia">${reserva.materia}</span>
                    </div>
                </div>
                <div class="reserva-estado">
                    <span class="estado-badge ${reserva.estado}">
                        ${traducirEstado(reserva.estado)}
                    </span>
                </div>
            </div>

            <div class="reserva-detalles">
                <div class="detalle-item">
                    <span class="icon">📅</span>
                    <span class="fecha">${formatearFecha(reserva.fecha)}</span>
                </div>
                <div class="detalle-item">
                    <span class="icon">⏰</span>
                    <span class="hora">${reserva.hora}</span>
                </div>
                <div class="detalle-item">
                    <span class="icon">⌛</span>
                    <span class="duracion">${reserva.duracion} minutos</span>
                </div>
                <div class="detalle-item">
                    <span class="icon">💻</span>
                    <span class="modalidad">${reserva.tipo}</span>
                </div>
            </div>

            <div class="reserva-footer">
                <div class="precio">
                    <span class="label">Total:</span>
                    <span class="monto">$${reserva.precio.toFixed(2)}</span>
                </div>
                <div class="acciones">
                    ${generarBotonesAccion(reserva)}
                </div>
            </div>
        </div>
    `).join('');

    // Agregar event listeners a los botones
    document.querySelectorAll('.btn-accion').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const accion = e.target.dataset.accion;
            const reservaId = e.target.dataset.reserva;
            manejarAccionReserva(accion, reservaId);
        });
    });
}

// Generar botones según estado
function generarBotonesAccion(reserva) {
    let botones = '';
    
    switch (reserva.estado) {
        case 'pendiente':
            botones = `
                <button class="btn-accion btn-iniciar" 
                        data-accion="iniciar" 
                        data-reserva="${reserva.id}">
                    Iniciar Clase
                </button>
                <button class="btn-accion btn-cancelar" 
                        data-accion="cancelar" 
                        data-reserva="${reserva.id}">
                    Cancelar
                </button>
            `;
            break;
        case 'completada':
            if (!reserva.calificacion) {
                botones = `
                    <button class="btn-accion btn-calificar" 
                            data-accion="calificar" 
                            data-reserva="${reserva.id}">
                        Calificar
                    </button>
                `;
            }
            break;
    }
    
    return botones;
}

// Manejar acciones
async function manejarAccionReserva(accion, reservaId) {
    try {
        switch (accion) {
            case 'iniciar':
                // Implementar lógica para iniciar clase
                break;
            case 'cancelar':
                await mostrarModalCancelacion(reservaId);
                break;
            case 'calificar':
                // Implementar lógica para calificar
                break;
        }
    } catch (error) {
        console.error('Error al manejar acción:', error);
        mostrarError('Error al procesar la acción');
    }
}

// Filtros
function aplicarFiltros() {
    const estado = document.getElementById('filtroEstado').value;
    const fecha = document.getElementById('filtroFecha').value;
    const busqueda = document.getElementById('busquedaReserva').value.toLowerCase();

    let reservasFiltradas = reservas;

    // Filtro por estado
    if (estado !== 'todas') {
        reservasFiltradas = reservasFiltradas.filter(r => r.estado === estado);
    }

    // Filtro por fecha
    if (fecha !== 'todas') {
        const hoy = new Date();
        const fechaReserva = new Date(reserva.fecha);
        
        switch (fecha) {
            case 'hoy':
                reservasFiltradas = reservasFiltradas.filter(r => 
                    esMismaFecha(new Date(r.fecha), hoy)
                );
                break;
            case 'semana':
                reservasFiltradas = reservasFiltradas.filter(r => 
                    esMismaSemana(new Date(r.fecha), hoy)
                );
                break;
            case 'mes':
                reservasFiltradas = reservasFiltradas.filter(r => 
                    esMismoMes(new Date(r.fecha), hoy)
                );
                break;
        }
    }

    // Filtro por búsqueda
    if (busqueda) {
        reservasFiltradas = reservasFiltradas.filter(r => 
            r.tutor.nombre.toLowerCase().includes(busqueda) ||
            r.materia.toLowerCase().includes(busqueda)
        );
    }

    renderizarReservas(reservasFiltradas);
}

// Modal de cancelación
function mostrarModalCancelacion(reservaId) {
    const modal = document.getElementById('modalCancelacion');
    const form = document.getElementById('formCancelacion');

    modal.style.display = 'block';

    form.onsubmit = async (e) => {
        e.preventDefault();
        await cancelarReserva(reservaId, document.getElementById('motivoCancelacion').value);
        cerrarModal();
    };
}

async function cancelarReserva(reservaId, motivo) {
    try {
        const reservaRef = doc(db, 'reservas', reservaId);
        await updateDoc(reservaRef, {
            estado: 'cancelada',
            motivoCancelacion: motivo,
            fechaCancelacion: new Date().toISOString()
        });

        mostrarExito('Reserva cancelada exitosamente');
        await cargarReservas();
    } catch (error) {
        console.error('Error al cancelar reserva:', error);
        mostrarError('Error al cancelar la reserva');
    }
}

// Funciones auxiliares
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function esMismaFecha(fecha1, fecha2) {
    return fecha1.toDateString() === fecha2.toDateString();
}

function esMismaSemana(fecha1, fecha2) {
    const inicioSemana1 = obtenerInicioSemana(fecha1);
    const inicioSemana2 = obtenerInicioSemana(fecha2);
    return inicioSemana1.getTime() === inicioSemana2.getTime();
}

function esMismoMes(fecha1, fecha2) {
    return fecha1.getMonth() === fecha2.getMonth() && 
           fecha1.getFullYear() === fecha2.getFullYear();
}

function obtenerInicioSemana(fecha) {
    const inicio = new Date(fecha);
    inicio.setDate(inicio.getDate() - inicio.getDay());
    inicio.setHours(0, 0, 0, 0);
    return inicio;
}

function traducirEstado(estado) {
    const estados = {
        'pendiente': 'Pendiente',
        'completada': 'Completada',
        'cancelada': 'Cancelada',
        'en_curso': 'En Curso'
    };
    return estados[estado] || estado;
}

function mostrarCargando(show) {
    const container = document.getElementById('reservasContainer');
    if (!container) return;

    if (show) {
        container.innerHTML = '<div class="loading-message">Cargando reservas...</div>';
    }
}

function mostrarError(mensaje) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = mensaje;

    const container = document.querySelector('.reservas-container');
    container.insertBefore(errorDiv, container.firstChild);

    setTimeout(() => errorDiv.remove(), 5000);
}

function mostrarExito(mensaje) {
    const exitoDiv = document.createElement('div');
    exitoDiv.className = 'success-message';
    exitoDiv.textContent = mensaje;

    const container = document.querySelector('.reservas-container');
    container.insertBefore(exitoDiv, container.firstChild);

    setTimeout(() => exitoDiv.remove(), 5000);
}

function cerrarModal() {
    const modal = document.getElementById('modalCancelacion');
    if (modal) {
        modal.style.display = 'none';
        document.getElementById('formCancelacion').reset();
    }
}

// Actualizar UI del usuario
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

// Funciones globales
window.cerrarSesion = async () => {
    try {
        await auth.signOut();
        window.location.href = 'login.html';
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        mostrarError('Error al cerrar sesión');
    }
};

window.cerrarModal = cerrarModal;