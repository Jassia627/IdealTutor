import { auth, db } from '../firebase/config.js';
import { 
    collection, 
    getDocs, 
    addDoc, 
    deleteDoc,
    doc,
    query, 
    where, 
    updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variables globales
let currentUser = null;
let selectedDate = new Date();
let horarios = [];
let preferencias = {
    duracionClase: 60,
    descansoEntreClases: 30,
    diasLaborables: ['1', '2', '3', '4', '5']
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    console.log('Iniciando aplicación de horarios...');
    verificarAutenticacion();
    inicializarEventListeners();
});

// Verificación de autenticación
function verificarAutenticacion() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            console.log('Usuario autenticado:', user.email);
            currentUser = user;
            await cargarDatosIniciales();
        } else {
            console.log('Usuario no autenticado, redirigiendo...');
            window.location.href = 'login.html';
        }
    });
}

// Carga inicial de datos
async function cargarDatosIniciales() {
    try {
        await Promise.all([
            cargarPreferencias(),
            cargarHorarios()
        ]);
        inicializarCalendario();
        renderizarHorariosDelDia();
    } catch (error) {
        console.error('Error al cargar datos iniciales:', error);
        mostrarError('Error al cargar los datos');
    }
}

// Gestión de horarios
async function cargarHorarios() {
    try {
        const q = query(
            collection(db, 'horarios'),
            where('tutorId', '==', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        horarios = [];
        snapshot.forEach(doc => {
            horarios.push({
                id: doc.id,
                ...doc.data(),
                fecha: new Date(doc.data().fecha)
            });
        });
        console.log('Horarios cargados:', horarios.length);
    } catch (error) {
        console.error('Error al cargar horarios:', error);
        mostrarError('Error al cargar los horarios');
    }
}

async function cargarPreferencias() {
    try {
        const userDoc = await getDocs(doc(db, 'usuarios', currentUser.uid));
        if (userDoc.exists() && userDoc.data().preferenciasHorario) {
            preferencias = userDoc.data().preferenciasHorario;
        }
        actualizarUIPreferencias();
    } catch (error) {
        console.error('Error al cargar preferencias:', error);
    }
}

// Inicialización de listeners
function inicializarEventListeners() {
    // Navegación del calendario
    const btnPrev = document.getElementById('prevMonth');
    const btnNext = document.getElementById('nextMonth');
    if (btnPrev) btnPrev.addEventListener('click', mesAnterior);
    if (btnNext) btnNext.addEventListener('click', mesSiguiente);

    // Botón de agregar horario
    const btnAgregar = document.getElementById('btnAgregarHorario');
    if (btnAgregar) btnAgregar.addEventListener('click', mostrarModalHorario);

    // Formulario de nuevo horario
    const formHorario = document.getElementById('formHorario');
    if (formHorario) formHorario.addEventListener('submit', guardarHorario);

    // Preferencias
    const duracionBtns = document.querySelectorAll('.duracion-btn');
    duracionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            duracionBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            actualizarPreferencias();
        });
    });

    // Días laborables
    const diasCheck = document.querySelectorAll('.dias-laborables input');
    diasCheck.forEach(check => {
        check.addEventListener('change', actualizarPreferencias);
    });

    // Descanso entre clases
    const selectDescanso = document.querySelector('.select-descanso');
    if (selectDescanso) {
        selectDescanso.addEventListener('change', actualizarPreferencias);
    }
}

// Funciones del calendario
function inicializarCalendario() {
    actualizarMesCalendario();
    renderizarCalendario();
}

function actualizarMesCalendario() {
    const mesElement = document.getElementById('currentMonth');
    if (mesElement) {
        mesElement.textContent = selectedDate.toLocaleString('es-ES', {
            month: 'long',
            year: 'numeric'
        });
    }
}

function renderizarCalendario() {
    const calendario = document.querySelector('.calendario-grid');
    if (!calendario) return;

    const primerDia = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const ultimoDia = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    
    let html = '';
    
    // Encabezados de días
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    diasSemana.forEach(dia => {
        html += `<div class="dia-semana">${dia}</div>`;
    });

    // Días vacíos iniciales
    for (let i = 0; i < primerDia.getDay(); i++) {
        html += '<div class="dia vacio"></div>';
    }

    // Días del mes
    for (let dia = 1; dia <= ultimoDia.getDate(); dia++) {
        const fecha = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dia);
        const clases = [
            'dia',
            esHoy(fecha) ? 'hoy' : '',
            tieneHorariosEnFecha(fecha) ? 'tiene-horarios' : '',
            esMismaFecha(fecha, selectedDate) ? 'seleccionado' : ''
        ].filter(Boolean).join(' ');

        html += `
            <div class="${clases}" onclick="window.seleccionarFecha(${dia})">
                ${dia}
            </div>
        `;
    }

    calendario.innerHTML = html;
}

// Funciones de horarios
function renderizarHorariosDelDia() {
    const horariosDelDia = obtenerHorariosDelDia();
    
    // Separar por períodos
    const periodos = {
        manana: horariosDelDia.filter(h => h.hora < '12:00'),
        tarde: horariosDelDia.filter(h => h.hora >= '12:00' && h.hora < '18:00'),
        noche: horariosDelDia.filter(h => h.hora >= '18:00')
    };

    // Renderizar cada período
    Object.entries(periodos).forEach(([periodo, horarios]) => {
        const container = document.getElementById(`slots${capitalize(periodo)}`);
        if (container) {
            container.innerHTML = horarios.map(horario => 
                crearSlotHorario(horario)
            ).join('');
        }
    });
}

function crearSlotHorario(horario) {
    return `
        <div class="slot ${horario.estado}" data-id="${horario.id}">
            <div class="hora">${formatearHora(horario.hora)}</div>
            <div class="estado">${traducirEstado(horario.estado)}</div>
            <button class="btn-eliminar" onclick="eliminarHorario('${horario.id}')">×</button>
        </div>
    `;
}

async function guardarHorario(e) {
    e.preventDefault();
    
    try {
        const horaInicio = document.getElementById('horaInicio').value;
        const horaFin = document.getElementById('horaFin').value;
        const repetir = document.getElementById('repeticion').value;

        const nuevoHorario = {
            tutorId: currentUser.uid,
            fecha: selectedDate.toISOString().split('T')[0],
            horaInicio,
            horaFin,
            repetir,
            estado: 'disponible',
            createdAt: new Date().toISOString()
        };

        await addDoc(collection(db, 'horarios'), nuevoHorario);
        await cargarHorarios();
        cerrarModalHorario();
        renderizarHorariosDelDia();
        mostrarExito('Horario guardado correctamente');

    } catch (error) {
        console.error('Error al guardar horario:', error);
        mostrarError('Error al guardar el horario');
    }
}

async function eliminarHorario(horarioId) {
    if (!confirm('¿Estás seguro de eliminar este horario?')) return;

    try {
        await deleteDoc(doc(db, 'horarios', horarioId));
        await cargarHorarios();
        renderizarHorariosDelDia();
        mostrarExito('Horario eliminado correctamente');
    } catch (error) {
        console.error('Error al eliminar horario:', error);
        mostrarError('Error al eliminar el horario');
    }
}

// Funciones de preferencias
async function actualizarPreferencias() {
    const duracionActiva = document.querySelector('.duracion-btn.active');
    const descanso = document.querySelector('.select-descanso').value;
    const diasSeleccionados = Array.from(document.querySelectorAll('.dias-laborables input:checked'))
        .map(input => input.value);

    preferencias = {
        duracionClase: parseInt(duracionActiva.dataset.duracion),
        descansoEntreClases: parseInt(descanso),
        diasLaborables: diasSeleccionados
    };

    try {
        await updateDoc(doc(db, 'usuarios', currentUser.uid), {
            preferenciasHorario: preferencias
        });
        mostrarExito('Preferencias actualizadas');
    } catch (error) {
        console.error('Error al actualizar preferencias:', error);
        mostrarError('Error al guardar las preferencias');
    }
}

// Funciones auxiliares
function esHoy(fecha) {
    const hoy = new Date();
    return esMismaFecha(fecha, hoy);
}

function esMismaFecha(fecha1, fecha2) {
    return fecha1.toDateString() === fecha2.toDateString();
}

function tieneHorariosEnFecha(fecha) {
    return horarios.some(h => esMismaFecha(new Date(h.fecha), fecha));
}

function obtenerHorariosDelDia() {
    return horarios.filter(h => esMismaFecha(new Date(h.fecha), selectedDate));
}

function formatearHora(hora) {
    return hora.substring(0, 5);
}

function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function traducirEstado(estado) {
    const estados = {
        'disponible': 'Disponible',
        'reservado': 'Reservado',
        'completado': 'Completado',
        'cancelado': 'Cancelado'
    };
    return estados[estado] || estado;
}

function mostrarError(mensaje) {
    // Implementar sistema de notificaciones
    alert(mensaje);
}

function mostrarExito(mensaje) {
    // Implementar sistema de notificaciones
    alert(mensaje);
}

// Funciones de navegación
function mesAnterior() {
    selectedDate.setMonth(selectedDate.getMonth() - 1);
    actualizarMesCalendario();
    renderizarCalendario();
}

function mesSiguiente() {
    selectedDate.setMonth(selectedDate.getMonth() + 1);
    actualizarMesCalendario();
    renderizarCalendario();
}

// Exportar funciones necesarias para uso global
window.seleccionarFecha = (dia) => {
    selectedDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), dia);
    renderizarCalendario();
    renderizarHorariosDelDia();
};

window.eliminarHorario = eliminarHorario;