import { auth, db } from '../firebase/config.js';
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let tipoUsuario = 'estudiante';

document.addEventListener('DOMContentLoaded', () => {
    inicializarEventListeners();
});

function inicializarEventListeners() {
    // Selector de tipo de usuario
    const tipoBtns = document.querySelectorAll('.tipo-btn');
    const camposTutor = document.getElementById('camposTutor');
    
    tipoBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Actualizar botones
            tipoBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            // Actualizar tipo de usuario
            tipoUsuario = btn.dataset.tipo;
            
            // Mostrar/ocultar campos de tutor
            if (camposTutor) {
                camposTutor.style.display = tipoUsuario === 'tutor' ? 'block' : 'none';
            }
        });
    });

    // Formulario de registro
    const registroForm = document.getElementById('registroForm');
    if (registroForm) {
        registroForm.addEventListener('submit', handleRegistro);
    }
}

async function handleRegistro(e) {
    e.preventDefault();
    
    try {
        mostrarCargando(true);

        // Obtener datos básicos
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const nombre = document.getElementById('nombre').value;

        // Validaciones
        if (password !== confirmPassword) {
            throw new Error('Las contraseñas no coinciden');
        }

        if (password.length < 8) {
            throw new Error('La contraseña debe tener al menos 8 caracteres');
        }

        // Crear usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Preparar datos del usuario
        const userData = {
            nombre: nombre,
            email: email,
            tipo: tipoUsuario,
            fechaRegistro: new Date().toISOString()
        };

        // Agregar campos adicionales si es tutor
        if (tipoUsuario === 'tutor') {
            const materias = Array.from(document.getElementById('materias').selectedOptions)
                .map(option => option.value);
            const experiencia = document.getElementById('experiencia').value;
            const descripcion = document.getElementById('descripcion').value;
            const precioHora = document.getElementById('precioHora').value;

            Object.assign(userData, {
                materias: materias,
                experiencia: parseInt(experiencia),
                descripcion: descripcion,
                precioHora: parseFloat(precioHora),
                calificacion: 0,
                numResenas: 0,
                activo: true
            });
        }

        // Guardar datos en Firestore
        await setDoc(doc(db, 'usuarios', user.uid), userData);

        mostrarExito('Registro exitoso! Redirigiendo...');

        // Redirigir según el tipo de usuario
        setTimeout(() => {
            if (tipoUsuario === 'tutor') {
                window.location.href = 'admin/panel.html';
            } else {
                window.location.href = 'servicios.html';
            }
        }, 2000);

    } catch (error) {
        console.error('Error en el registro:', error);
        mostrarError(traducirError(error));
    } finally {
        mostrarCargando(false);
    }
}

function mostrarCargando(show) {
    const btnSubmit = document.querySelector('.btn-registro');
    if (btnSubmit) {
        btnSubmit.disabled = show;
        btnSubmit.textContent = show ? 'Creando cuenta...' : 'Crear cuenta';
    }
}

function mostrarError(mensaje) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = mensaje;
    
    const form = document.getElementById('registroForm');
    // Remover error anterior si existe
    const prevError = form.querySelector('.error-message');
    if (prevError) prevError.remove();
    
    form.insertBefore(errorDiv, form.firstChild);
    setTimeout(() => errorDiv.remove(), 5000);
}

function mostrarExito(mensaje) {
    const exitoDiv = document.createElement('div');
    exitoDiv.className = 'success-message';
    exitoDiv.textContent = mensaje;
    
    const form = document.getElementById('registroForm');
    form.insertBefore(exitoDiv, form.firstChild);
}

function traducirError(error) {
    const mensajes = {
        'auth/email-already-in-use': 'Este correo electrónico ya está registrado',
        'auth/invalid-email': 'Correo electrónico inválido',
        'auth/operation-not-allowed': 'Operación no permitida',
        'auth/weak-password': 'La contraseña es demasiado débil',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet'
    };

    if (error.code && mensajes[error.code]) {
        return mensajes[error.code];
    }

    return error.message || 'Ocurrió un error durante el registro';
}