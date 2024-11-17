import { auth, db, collection, getDocs } from '../firebase/config.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Variables del DOM
let loginForm;
let btnGoogleLogin;
let errorDiv;

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔍 Iniciando script de login...');
    
    // Obtener elementos del DOM
    loginForm = document.getElementById('loginForm');
    btnGoogleLogin = document.getElementById('btnGoogleLogin');
    errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    
    if (loginForm) {
        console.log('✅ Formulario de login encontrado');
        loginForm.addEventListener('submit', handleLogin);
    } else {
        console.error('❌ No se encontró el formulario de login');
    }
    
    // Verificar la conexión con Firebase
    checkFirebaseConnection();
});

// Función para verificar la conexión con Firebase
async function checkFirebaseConnection() {
    console.log('🔄 Verificando conexión con Firebase...');
    
    try {
        if (auth) {
            console.log('✅ Auth inicializado correctamente');
        } else {
            console.error('❌ Auth no está inicializado');
        }
        
        if (db) {
            console.log('✅ Firestore inicializado correctamente');
            // Intentar una operación simple de lectura
            const testCollection = collection(db, 'test');
            const testSnapshot = await getDocs(testCollection);
            console.log('✅ Conexión a Firestore probada exitosamente');
        } else {
            console.error('❌ Firestore no está inicializado');
        }
    } catch (error) {
        console.error('❌ Error al verificar Firebase:', error);
        showError('Error de conexión con Firebase: ' + error.message);
    }
}

// Función principal de login
async function handleLogin(e) {
    e.preventDefault();
    console.log('🔄 Iniciando proceso de login...');

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        console.log('🔄 Intentando autenticar usuario...');
        showLoading(true);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log('✅ Usuario autenticado:', userCredential.user.email);

        // Obtener datos adicionales del usuario
        const userDocRef = doc(db, 'usuarios', userCredential.user.uid);
        const userDocSnap = await getDoc(userDocRef);
        
        if (userDocSnap.exists()) {
            console.log('✅ Datos de usuario encontrados');
            const userData = userDocSnap.data();
            
            // Guardar datos en localStorage
            localStorage.setItem('userData', JSON.stringify({
                uid: userCredential.user.uid,
                email: userCredential.user.email,
                tipo: userData.tipo
            }));

            // Redirigir según el tipo de usuario
            if (userData.tipo === 'tutor') {
                window.location.href = '../admin/panel.html';
            } else {
                window.location.href = 'servicios.html';
            }
        } else {
            console.error('❌ No se encontraron datos del usuario');
            showError('Error: No se encontraron datos del usuario');
        }

    } catch (error) {
        console.error('❌ Error en login:', error);
        showDetailedError(error);
    } finally {
        showLoading(false);
    }
}

// Función para mostrar errores detallados
function showDetailedError(error) {
    let errorMessage = 'Error desconocido';
    
    const errorMap = {
        'auth/invalid-email': 'El correo electrónico no es válido',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada',
        'auth/user-not-found': 'No existe una cuenta con este correo',
        'auth/wrong-password': 'Contraseña incorrecta',
        'auth/network-request-failed': 'Error de conexión a internet',
        'auth/too-many-requests': 'Demasiados intentos fallidos',
        'auth/operation-not-allowed': 'Operación no permitida',
        'auth/popup-closed-by-user': 'Ventana cerrada por el usuario',
    };

    if (error.code) {
        errorMessage = errorMap[error.code] || `Error de Firebase: ${error.code}`;
        console.log('📝 Código de error:', error.code);
    }

    console.error('📝 Mensaje de error completo:', error);
    showError(errorMessage);
}

function showError(message) {
    errorDiv.textContent = message;
    if (!document.body.contains(errorDiv)) {
        loginForm.insertBefore(errorDiv, loginForm.firstChild);
    }
    console.error('🚨 Error mostrado:', message);
}

function showLoading(show) {
    const btnSubmit = document.querySelector('button[type="submit"]');
    if (btnSubmit) {
        btnSubmit.disabled = show;
        btnSubmit.textContent = show ? 'Cargando...' : 'Iniciar Sesión';
    }
}

// Observador de estado de autenticación
auth.onAuthStateChanged((user) => {
    console.log('👤 Estado de autenticación cambiado:', user ? 'Usuario logueado' : 'No hay usuario');
    if (user) {
        console.log('✅ Usuario actual:', user.email);
    }
});