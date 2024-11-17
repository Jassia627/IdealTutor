import { auth, db } from './config.js';

// Funciones de autenticación
export const crearUsuario = async (email, password, userData) => {
    try {
        // Crear usuario en Firebase Auth
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // Guardar datos adicionales en Firestore
        await db.collection('usuarios').doc(user.uid).set({
            email: email,
            nombre: userData.nombre,
            tipo: userData.tipo, // 'estudiante' o 'tutor'
            fechaRegistro: new Date(),
            ...userData
        });

        return user;
    } catch (error) {
        console.error('Error al crear usuario:', error);
        throw error;
    }
};

export const iniciarSesion = async (email, password) => {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        throw error;
    }
};

export const cerrarSesion = async () => {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        throw error;
    }
};

export const recuperarContraseña = async (email) => {
    try {
        await auth.sendPasswordResetEmail(email);
    } catch (error) {
        console.error('Error al enviar email de recuperación:', error);
        throw error;
    }
};

export const actualizarPerfil = async (userId, userData) => {
    try {
        await db.collection('usuarios').doc(userId).update(userData);
    } catch (error) {
        console.error('Error al actualizar perfil:', error);
        throw error;
    }
};