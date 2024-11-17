import { auth, db } from '../firebase/config.js';

// Función para probar la conexión
async function testFirebaseConnection() {
    try {
        // Intentar obtener una colección de prueba
        const testCollection = await db.collection('test').get();
        console.log('Conexión a Firebase exitosa!');
        return true;
    } catch (error) {
        console.error('Error al conectar con Firebase:', error);
        return false;
    }
}

// Función para probar la autenticación
async function testAuth() {
    try {
        // Observador de estado de autenticación
        auth.onAuthStateChanged((user) => {
            if (user) {
                console.log('Usuario autenticado:', user.email);
            } else {
                console.log('No hay usuario autenticado');
            }
        });
        return true;
    } catch (error) {
        console.error('Error en la autenticación:', error);
        return false;
    }
}

// Ejecutar pruebas
testFirebaseConnection();
testAuth();