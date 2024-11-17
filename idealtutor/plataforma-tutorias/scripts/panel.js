import { auth, db } from '../../firebase/config.js';
import { doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
let tutorData = null;

document.addEventListener('DOMContentLoaded', async () => {
    verificarAutenticacion();
    inicializarEventListeners();
});

// Verificación de autenticación
function verificarAutenticacion() {
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            await cargarDatosTutor(user.uid);
            await cargarEstadisticas();
            await cargarProximasClases();
            inicializarGraficos();
        } else {
            window.location.href = '../html/login.html';
        }
    });
}

async function cargarDatosTutor(uid) {
    try {
        const tutorDoc = await getDoc(doc(db, 'usuarios', uid));
        if (tutorDoc.exists() && tutorDoc.data().tipo === 'tutor') {
            tutorData = tutorDoc.data();
            actualizarUITutor();
        } else {
            throw new Error('No se encontraron datos del tutor');
        }
    } catch (error) {
        console.error('Error al cargar datos del tutor:', error);
        mostrarError('Error al cargar los datos del tutor');
    }
}

async function cargarEstadisticas() {
    try {
        // Cargar estudiantes activos
        const estudiantesQuery = query(
            collection(db, 'reservas'),
            where('tutorId', '==', currentUser.uid),
            where('estado', '==', 'activo')
        );
        const estudiantesSnap = await getDocs(estudiantesQuery);
        const estudiantesUnicos = new Set(estudiantesSnap.docs.map(doc => doc.data().estudianteId));

        // Cargar clases impartidas
        const clasesQuery = query(
            collection(db, 'reservas'),
            where('tutorId', '==', currentUser.uid),
            where('estado', '==', 'completado')
        );
        const clasesSnap = await getDocs(clasesQuery);

        // Calcular ganancias
        const ganancias = clasesSnap.docs.reduce((total, doc) => total + doc.data().precio, 0);

        actualizarEstadisticas({
            estudiantes: estudiantesUnicos.size,
            clases: clasesSnap.size,
            ganancias: ganancias,
            calificacion: tutorData.calificacion || 0,
            numResenas: tutorData.numResenas || 0
        });

    } catch (error) {
        console.error('Error al cargar estadísticas:', error);
        mostrarError('Error al cargar estadísticas');
    }
}

async function cargarProximasClases() {
    try {
        const hoy = new Date();
        const proximasClasesQuery = query(
            collection(db, 'reservas'),
            where('tutorId', '==', currentUser.uid),
            where('fecha', '>=', hoy),
            where('estado', '==', 'pendiente')
        );

        const clasesSnap = await getDocs(proximasClasesQuery);
        const clases = await Promise.all(clasesSnap.docs.map(async doc => {
            const clase = doc.data();
            const estudiante = await getDoc(doc(db, 'usuarios', clase.estudianteId));
            return {
                id: doc.id,
                ...clase,
                estudiante: estudiante.data()
            };
        }));

        renderizarProximasClases(clases);

    } catch (error) {
        console.error('Error al cargar próximas clases:', error);
        mostrarError('Error al cargar el horario de clases');
    }
}

// Funciones de UI
function actualizarUITutor() {
    document.getElementById('tutorName').textContent = tutorData.nombre;
    document.getElementById('tutorImage').src = tutorData.foto || '../recursos/imagenes/default-profile.png';
}

function actualizarEstadisticas(stats) {
    // Actualizar tarjetas de estadísticas
    document.querySelector('.students .stat-number').textContent = stats.estudiantes;
    document.querySelector('.classes .stat-number').textContent = stats.clases;
    document.querySelector('.earnings .stat-number').textContent = `$${stats.ganancias.toFixed(2)}`;
    document.querySelector('.rating .stat-number').textContent = stats.calificacion.toFixed(1);
    document.querySelector('.reviews').textContent = `(${stats.numResenas} reseñas)`;
}

function renderizarProximasClases(clases) {
    const tbody = document.getElementById('upcomingClassesBody');
    if (!tbody) return;

    tbody.innerHTML = clases.map(clase => `
        <tr>
            <td>
                <div class="estudiante-info">
                    <img src="${clase.estudiante.foto || '../recursos/imagenes/default-profile.png'}" 
                         alt="${clase.estudiante.nombre}"
                         class="estudiante-foto">
                    <span>${clase.estudiante.nombre}</span>
                </div>
            </td>
            <td>${clase.materia}</td>
            <td>${formatearFecha(clase.fecha)}</td>
            <td>${clase.hora}</td>
            <td>
                <span class="estado-badge ${clase.estado}">
                    ${traducirEstado(clase.estado)}
                </span>
            </td>
            <td>
                <div class="acciones">
                    <button onclick="iniciarClase('${clase.id}')" 
                            class="btn-accion iniciar">
                        Iniciar
                    </button>
                    <button onclick="cancelarClase('${clase.id}')" 
                            class="btn-accion cancelar">
                        Cancelar
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function inicializarGraficos() {
    // Aquí puedes inicializar los gráficos con una librería como Chart.js
    // Por ahora mostraremos un placeholder
    document.getElementById('earningsChart').innerHTML = 
        '<div class="placeholder-chart">Gráfico de ganancias</div>';
    document.getElementById('studentsChart').innerHTML = 
        '<div class="placeholder-chart">Gráfico de estudiantes</div>';
}

// Funciones auxiliares
function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function traducirEstado(estado) {
    const estados = {
        'pendiente': 'Pendiente',
        'activo': 'En curso',
        'completado': 'Completado',
        'cancelado': 'Cancelado'
    };
    return estados[estado] || estado;
}

function mostrarError(mensaje) {
    // Implementar sistema de notificaciones
    console.error(mensaje);
}

// Event listeners
function inicializarEventListeners() {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await auth.signOut();
                window.location.href = '../html/login.html';
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
                mostrarError('Error al cerrar sesión');
            }
        });
    }
}

// Exportar funciones necesarias
window.iniciarClase = async (claseId) => {
    // Implementar lógica para iniciar clase
    console.log('Iniciando clase:', claseId);
};

window.cancelarClase = async (claseId) => {
    // Implementar lógica para cancelar clase
    console.log('Cancelando clase:', claseId);
};