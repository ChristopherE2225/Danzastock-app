import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, addDoc, updateDoc, deleteDoc, onSnapshot, collection } from 'firebase/firestore';
import { getAnalytics } from "firebase/analytics";

// --- Tu configuración real de Firebase ---
const firebaseConfig = {
  apiKey: "AIzaSyALk8eY3cyM0yfIWCvHKTouos0bK0eIMMo",
  authDomain: "danzastock-app.firebaseapp.com",
  projectId: "danzastock-app",
  storageBucket: "danzastock-app.firebasestorage.app",
  messagingSenderId: "34990121437",
  appId: "1:34990121437:web:ec80cb15b63294db645634",
  measurementId: "G-8NWQSRN9VD"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// --- Componente principal de la aplicación ---
export default function App() {
  const [inventario, setInventario] = useState([]);
  const [nombre, setNombre] = useState('');
  const [cantidad, setCantidad] = useState('');
  const [estatus, setEstatus] = useState('almacén');
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Mensaje para el usuario
  const [message, setMessage] = useState('');
  const [showMessage, setShowMessage] = useState(false);

  // Muestra un mensaje temporal al usuario
  const showUserMessage = (text) => {
    setMessage(text);
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
    }, 3000);
  };

  // --- Efecto para la autenticación y carga de datos ---
  useEffect(() => {
    // Escucha los cambios de autenticación
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Usuario autenticado, establece el userId
        setUserId(user.uid);
      } else {
        // No hay usuario, inicia sesión de forma anónima
        try {
          await signInAnonymously(auth);
        } catch (error) {
          console.error("Error al iniciar sesión:", error);
          setLoading(false);
          showUserMessage('Error: No se pudo conectar a la base de datos.');
        }
      }
    });

    // Limpia el listener cuando el componente se desmonte
    return () => unsubscribeAuth();
  }, []);

  // --- Efecto para cargar los datos del inventario una vez que el usuario está autenticado ---
  useEffect(() => {
    if (userId) {
      setLoading(true);
      // --- CAMBIO AQUÍ: Simplificamos la ruta de la colección ---
      const collectionPath = `danzastock_inventario`;

      // Escucha los cambios en la colección en tiempo real
      const unsubscribeFirestore = onSnapshot(collection(db, collectionPath), (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setInventario(items);
        setLoading(false);
      }, (error) => {
        console.error("Error al cargar los datos:", error);
        setLoading(false);
        showUserMessage('Error al cargar el inventario.');
      });

      // Limpia el listener cuando el componente se desmonte o el userId cambie
      return () => unsubscribeFirestore();
    }
  }, [userId]);

  // --- Manejadores de eventos de la aplicación ---

  // Añade o edita un material
  const handleAddOrUpdate = async (e) => {
    e.preventDefault();
    if (!nombre || !cantidad) {
      showUserMessage('Por favor, completa todos los campos.');
      return;
    }

    try {
      // --- CAMBIO AQUÍ: Simplificamos la ruta de la colección ---
      const inventarioRef = collection(db, `danzastock_inventario`);
      const itemData = {
        nombre: nombre,
        cantidad: parseInt(cantidad, 10),
        estatus: estatus,
      };

      if (editId) {
        // Editar un elemento existente
        const itemDoc = doc(inventarioRef, editId);
        await updateDoc(itemDoc, itemData);
        showUserMessage('Material actualizado con éxito.');
        setEditId(null);
      } else {
        // Añadir un nuevo elemento
        await addDoc(inventarioRef, itemData);
        showUserMessage('Material añadido con éxito.');
      }

      // Limpia el formulario
      setNombre('');
      setCantidad('');
      setEstatus('almacén');

    } catch (error) {
      console.error("Error al añadir/actualizar el material:", error);
      showUserMessage('Error al guardar el material.');
    }
  };

  // Prepara el formulario para editar un material
  const handleEdit = (item) => {
    setEditId(item.id);
    setNombre(item.nombre);
    setCantidad(item.cantidad);
    setEstatus(item.estatus);
    showUserMessage(`Editando ${item.nombre}.`);
  };

  // Elimina un material
  const handleDelete = async (id) => {
    // Alerta de confirmación personalizada en lugar de window.confirm()
    const result = await new Promise(resolve => {
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50';
      modal.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow-xl text-center">
                <p class="mb-4">¿Estás seguro de que quieres eliminar este material?</p>
                <button id="confirm-yes" class="px-4 py-2 bg-red-500 text-white rounded-md mr-2">Sí</button>
                <button id="confirm-no" class="px-4 py-2 bg-gray-300 text-gray-800 rounded-md">No</button>
            </div>
        `;
      document.body.appendChild(modal);
      document.getElementById('confirm-yes').onclick = () => {
        document.body.removeChild(modal);
        resolve(true);
      };
      document.getElementById('confirm-no').onclick = () => {
        document.body.removeChild(modal);
        resolve(false);
      };
    });

    if (!result) {
      return;
    }

    try {
      // --- CAMBIO AQUÍ: Simplificamos la ruta de la colección ---
      const inventarioRef = collection(db, `danzastock_inventario`);
      const itemDoc = doc(inventarioRef, id);
      await deleteDoc(itemDoc);
      showUserMessage('Material eliminado con éxito.');
    } catch (error) {
      console.error("Error al eliminar el material:", error);
      showUserMessage('Error al eliminar el material.');
    }
  };

  // --- Estructura de la Interfaz de Usuario (UI) ---
  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center font-sans">
      <div className="w-full max-w-4xl bg-white shadow-xl rounded-2xl p-6 md:p-10 border border-gray-200">

        {/* Encabezado y subtítulo */}
        <h1 className="text-4xl md:text-5xl font-extrabold text-center text-indigo-700 mb-2">
          DanzaStock
        </h1>
        <p className="text-center text-lg text-gray-600 mb-8">
          Gestión de inventario para el equipo de danza
        </p>

        {/* Mensaje de notificación flotante */}
        {showMessage && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-6 py-3 rounded-full shadow-lg z-50 transition-transform duration-300 transform-gpu animate-fade-in">
            {message}
          </div>
        )}

        {/* Formulario de registro/edición */}
        <form onSubmit={handleAddOrUpdate} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del material"
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors col-span-1 md:col-span-2"
          />
          <input
            type="number"
            value={cantidad}
            onChange={(e) => setCantidad(e.target.value)}
            placeholder="Cantidad"
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          />
          <select
            value={estatus}
            onChange={(e) => setEstatus(e.target.value)}
            className="p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
          >
            <option value="almacén">Almacén</option>
            <option value="prestado">Prestado</option>
            <option value="en-reparacion">En reparación</option>
            <option value="perdido">Perdido</option>
          </select>
          <button
            type="submit"
            className="w-full py-3 px-6 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-200 transform hover:scale-105 col-span-1 md:col-span-4"
          >
            {editId ? 'Guardar Cambios' : 'Añadir Material'}
          </button>
        </form>

        {/* Carga y visualización del inventario */}
        {loading ? (
          <div className="flex justify-center items-center h-48 text-lg text-gray-500">
            Cargando inventario...
          </div>
        ) : inventario.length === 0 ? (
          <div className="flex justify-center items-center h-48 text-lg text-gray-500">
            No hay materiales en el inventario. ¡Añade el primero!
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg shadow-md">
            <table className="min-w-full bg-white rounded-lg">
              <thead className="bg-gray-200">
                <tr className="text-gray-600 uppercase text-sm leading-normal">
                  <th className="py-3 px-6 text-left">Material</th>
                  <th className="py-3 px-6 text-left">Cantidad</th>
                  <th className="py-3 px-6 text-left">Estatus</th>
                  <th className="py-3 px-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="text-gray-600 text-sm font-light">
                {inventario.map((item) => (
                  <tr key={item.id} className="border-b border-gray-200 hover:bg-gray-100 transition-colors">
                    <td className="py-3 px-6 text-left whitespace-nowrap">{item.nombre}</td>
                    <td className="py-3 px-6 text-left">{item.cantidad}</td>
                    <td className="py-3 px-6 text-left">
                      <span className={`py-1 px-3 rounded-full text-xs font-semibold
                        ${item.estatus === 'almacén' ? 'bg-green-200 text-green-800' : ''}
                        ${item.estatus === 'prestado' ? 'bg-yellow-200 text-yellow-800' : ''}
                        ${item.estatus === 'en-reparacion' ? 'bg-orange-200 text-orange-800' : ''}
                        ${item.estatus === 'perdido' ? 'bg-red-200 text-red-800' : ''}
                      `}>
                        {item.estatus}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-center">
                      <div className="flex item-center justify-center space-x-2">
                        <button
                          onClick={() => handleEdit(item)}
                          className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="w-8 h-8 rounded-full bg-red-100 text-red-600 hover:bg-red-200 flex items-center justify-center"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.013 21H7.987a2 2 0 01-1.92-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Muestra el ID de usuario para referencia */}
      {userId && (
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Tu ID de usuario (para la persistencia de datos):</p>
          <p className="font-mono break-all mt-1 px-4 py-2 bg-gray-200 rounded-md inline-block">{userId}</p>
        </div>
      )}
    </div>
  );
}