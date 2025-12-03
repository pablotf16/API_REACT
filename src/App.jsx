import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StatCard from './components/StatCard';
import WorkoutItem from './components/WorkoutItem';
import { initializeApp } from 'firebase/app';
// Elimina las importaciones de CSS Modules
// import formStyles from './NewWorkoutForm.module.css';
// import historyStyles from './HistorySection.module.css';

import { 
  getAuth, 
  onAuthStateChanged, 
  signInAnonymously, 
  signInWithCustomToken 
} from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, addDoc, deleteDoc, doc, Timestamp, orderBy } from 'firebase/firestore';

const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

const WORKOUT_TYPES = ['Correr', 'Ciclismo', 'Pesas', 'Yoga', 'Natación', 'Otro'];

const NEW_EXERCISE_TEMPLATE = {
  tempId: Date.now(), 
  name: '',
  sets: '', 
  reps: '', 
  weight: '', 
};

// (Eliminada la función translateFirebaseError)

// Componente principal de la aplicación
const App = () => {
  const [workouts, setWorkouts] = useState([]);
  const [newWorkout, setNewWorkout] = useState({
    title: '', 
    type: WORKOUT_TYPES[0],
    duration: '', 
    calories: '',
    date: new Date().toISOString().substring(0, 10), 
    exercises: [], 
  });
  
  // Estados de autenticación (revertidos)
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [userId, setUserId] = useState(null);
  // (Eliminados currentUser, isAuthModalOpen, authMode, email, password)
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [filterType, setFilterType] = useState('Todos'); 
<div className="bg-red-500 text-white p-10 text-4xl font-bold">
  TEST DE TAILWIND
</div>
  // 1. Configuración de Firebase y Autenticación (REVERTIDO a anónimo)
  useEffect(() => {
    try {
      // Basic validation: guard against missing config or placeholder values
      const isEmptyConfig = Object.keys(firebaseConfig).length === 0;
      const apiKey = firebaseConfig.apiKey || '';
      const looksLikePlaceholder = apiKey.startsWith('YOUR_') || apiKey === 'default-app-id' || apiKey.includes('REPLACE_');

      if (isEmptyConfig || looksLikePlaceholder) {
        console.error("Firebase config is missing or contains placeholder values.");
        setError("Firebase configuration missing or invalid. Please populate firebase-config.js with your project's credentials.");
        setLoading(false);
        return;
      }

      const app = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);
      setAuth(firebaseAuth);

      // onAuthStateChanged ahora vuelve a gestionar el inicio de sesión anónimo
      const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
        if (!user) {
          // Si no hay usuario, intenta iniciar sesión (anónimo o con token)
          try {
            if (initialAuthToken) {
              await signInWithCustomToken(firebaseAuth, initialAuthToken);
            } else {
              await signInAnonymously(firebaseAuth);
            }
          } catch (e) {
            console.error("Error signing in:", e);
            setError("Error de autenticación. Consulta la consola.");
          }
        }
        // Siempre habrá un usuario (anónimo o logueado)
        setUserId(firebaseAuth.currentUser?.uid || 'anonymous');
        setLoading(false);
      });

      return () => unsubscribeAuth();
    } catch (e) {
      console.error("Error during Firebase initialization:", e);
      setError("Fallo al inicializar Firebase. Consulta la consola.");
      setLoading(false);
    }
  }, []); // Dependencia vacía, se ejecuta solo una vez

  // 2. Escucha de Datos en Tiempo Real (onSnapshot)
  useEffect(() => {
    // Se ejecuta cuando db o userId están listos
    if (!db || !userId) {
      return; 
    }

    const workoutsCollectionPath = `artifacts/${appId}/users/${userId}/workouts`;
    const q = query(collection(db, workoutsCollectionPath), orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedWorkouts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().timestamp ? doc.data().timestamp.toDate().toISOString().substring(0, 10) : 'N/A',
      }));
      setWorkouts(fetchedWorkouts);
    }, (e) => {
      console.error("Error fetching workouts:", e);
      setError("Error al cargar entrenamientos.");
    });

    return () => unsubscribe();
  }, [db, userId]); // Se ejecuta cuando db o userId cambian

  // --- (Eliminados Handlers de Autenticación: handleLogin, handleSignUp, handleLogout) ---


  // --- Handlers existentes (Formulario y Ejercicios) ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewWorkout(prev => ({ ...prev, [name]: value }));
  };

  const handleAddExerciseRow = () => {
    setNewWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, { ...NEW_EXERCISE_TEMPLATE, tempId: Date.now() }],
    }));
  };

  const handleUpdateExerciseRow = (tempId, field, value) => {
    setNewWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.map(ex => 
        ex.tempId === tempId ? { ...ex, [field]: value } : ex
      ),
    }));
  };

  const handleRemoveExerciseRow = (tempId) => {
    setNewWorkout(prev => ({
      ...prev,
      exercises: prev.exercises.filter(ex => ex.tempId !== tempId),
    }));
  };
  
  const handleReuseWorkout = useCallback((workoutToReuse) => {
    setNewWorkout({
      title: workoutToReuse.title || '',
      type: workoutToReuse.type,
      duration: '',
      calories: '',
      date: new Date().toISOString().substring(0, 10),
      exercises: (workoutToReuse.exercises || []).map(ex => ({
        ...ex,
        tempId: Date.now() + Math.random(),
      })),
    });
    setError('');
    document.getElementById('new-workout-form')?.scrollIntoView({ behavior: 'smooth' });
  }, [setNewWorkout, setError]);

  const handleAddWorkout = async (e) => {
    e.preventDefault();
    if (!db || !userId) {
      setError("Base de datos no disponible.");
      return;
    }
    if (!newWorkout.title.trim()) {
      setError("Por favor, añade un título a la sesión.");
      return;
    }
    const duration = parseInt(newWorkout.duration);
    const calories = parseInt(newWorkout.calories);
    if (isNaN(duration) || duration <= 0 || isNaN(calories) || calories <= 0) {
      setError("La duración y las calorías deben ser números positivos.");
      return;
    }

    try {
      await addDoc(collection(db, `artifacts/${appId}/users/${userId}/workouts`), {
        title: newWorkout.title,
        type: newWorkout.type,
        duration: duration,
        calories: calories,
        exercises: newWorkout.exercises.map(({ tempId, ...rest }) => rest), 
        timestamp: Timestamp.fromDate(new Date(newWorkout.date)),
        createdAt: Timestamp.now(),
      });
      setNewWorkout({
        title: '',
        type: WORKOUT_TYPES[0],
        duration: '',
        calories: '',
        date: new Date().toISOString().substring(0, 10),
        exercises: [],
      });
      setError('');
    } catch (e) {
      console.error("Error adding document: ", e);
      setError("Error al guardar el entrenamiento.");
    }
  };

  const handleDeleteWorkout = useCallback(async (id) => {
    if (!db || !userId) {
      setError("Base de datos no disponible.");
      return;
    }
    try {
      await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/workouts`, id));
      setError('');
    } catch (e) {
      console.error("Error removing document: ", e);
      setError("Error al eliminar el entrenamiento.");
    }
  }, [db, userId]);

  // --- Lógica de Filtrado y Estadísticas ---
  const workoutsToDisplay = useMemo(() => (
    filterType === 'Todos' ? workouts : workouts.filter(w => w.type === filterType)
  ), [workouts, filterType]);

  const totalDuration = useMemo(() => workoutsToDisplay.reduce((sum, w) => sum + (w.duration || 0), 0), [workoutsToDisplay]);
  const totalCalories = useMemo(() => workoutsToDisplay.reduce((sum, w) => sum + (w.calories || 0), 0), [workoutsToDisplay]);


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="text-xl font-semibold text-blue-600">Cargando aplicación...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 sm:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        
        <header className="text-center mb-10">
          <h1 className="text-4xl font-extrabold text-blue-700">Rastreador de Entrenamientos 🏋️‍♀️</h1>
          <p className="text-gray-600 mt-2">ID de Usuario: <span className="font-mono text-xs p-1 bg-gray-200 rounded">{userId}</span></p>
        </header>

        <>
            {error && (
              <div className="my-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Sección de Resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 justify-items-center">
                <div className="w-full max-w-sm">
                  <StatCard title="Total Entrenamientos" value={workouts.length} />
                </div>
                <div className="w-full max-w-sm">
                  <StatCard 
                    title={filterType === 'Todos' ? "Duración Total (min)" : `Duración (${filterType})`} 
                    value={totalDuration} 
                  />
                </div>
                <div className="w-full max-w-sm">
                  <StatCard 
                    title={filterType === 'Todos' ? "Calorías Totales" : `Calorías (${filterType})`} 
                    value={totalCalories} 
                  />
                </div>
            </div>

            {/* Formulario para Agregar Nuevo Entrenamiento (Refactorizado) */}
            <div id="new-workout-form" className="
              w-full max-w-[42rem] mx-auto mb-10 p-6 flex flex-col items-center
              bg-gradient-to-b from-white to-blue-50
              border-2 border-blue-200 rounded-2xl
              shadow-sm hover:shadow-xl hover:shadow-blue-500/15 hover:border-blue-500
              transition-all duration-300 ease-in-out
            ">
              <h2 className="text-blue-600 text-center font-extrabold text-2xl mb-6">Registrar Nuevo Entrenamiento</h2>
              
              <form onSubmit={handleAddWorkout} className="space-y-6 w-full">
                {/* Campo de Título */}
                <div>
                  <label htmlFor="title" className="block text-sm font-semibold text-blue-800 mb-1">Título de la Sesión</label>
                  <input
                    type="text"
                    name="title"
                    id="title"
                    value={newWorkout.title}
                    onChange={handleInputChange}
                    required
                    placeholder="Ej: Día de Pierna, Cardio Intenso"
                    className="
                      bg-white border border-gray-300 rounded-lg py-2 px-3 w-full 
                      text-gray-800 transition-all focus:outline-none focus:border-blue-500 
                      focus:ring-4 focus:ring-blue-500/30
                    "
                  />
                </div>

                {/* Campos principales en Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label htmlFor="date" className="block text-sm font-semibold text-blue-800 mb-1">Fecha</label>
                    <input
                      type="date"
                      name="date"
                      id="date"
                      value={newWorkout.date}
                      onChange={handleInputChange}
                      required
                      className="bg-white border border-gray-300 rounded-lg py-2 px-3 w-full text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="type" className="block text-sm font-semibold text-blue-800 mb-1">Tipo</label>
                    <select
                      name="type"
                      id="type"
                      value={newWorkout.type}
                      onChange={handleInputChange}
                      required
                      className="bg-white border border-gray-300 rounded-lg py-2 px-3 w-full text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all"
                    >
                      {WORKOUT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="duration" className="block text-sm font-semibold text-blue-800 mb-1">Duración (min)</label>
                    <input
                      type="number"
                      name="duration"
                      id="duration"
                      value={newWorkout.duration}
                      onChange={handleInputChange}
                      min="1"
                      required
                      placeholder="60"
                      className="bg-white border border-gray-300 rounded-lg py-2 px-3 w-full text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="calories" className="block text-sm font-semibold text-blue-800 mb-1">Calorías</label>
                    <input
                      type="number"
                      name="calories"
                      id="calories"
                      value={newWorkout.calories}
                      onChange={handleInputChange}
                      min="1"
                      required
                      placeholder="300"
                      className="bg-white border border-gray-300 rounded-lg py-2 px-3 w-full text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30 transition-all"
                    />
                  </div>
                </div>

                {/* Sección de Ejercicios Detallados (Tabla) */}
                <div className="bg-white/70 border border-blue-200 rounded-xl p-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-blue-700">Ejercicios Detallados</h3>
                        <button
                            type="button"
                            onClick={handleAddExerciseRow}
                            className="flex items-center text-sm px-4 py-2 bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition font-semibold border border-blue-200"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-plus mr-1"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                            Añadir Ejercicio
                        </button>
                    </div>
                    
                    <div className="overflow-x-auto">
                        {newWorkout.exercises.length > 0 && (
                            <table className="min-w-full divide-y divide-blue-200">
                                <thead className="bg-blue-50">
                                  <tr> 
                                    <th className="px-3 py-2 text-left text-xs font-bold text-blue-600 uppercase w-1/3">Ejercicio</th>
                                    <th className="px-3 py-2 text-left text-xs font-bold text-blue-600 uppercase">Series</th>
                                    <th className="px-3 py-2 text-left text-xs font-bold text-blue-600 uppercase">Reps</th>
                                    <th className="px-3 py-2 text-left text-xs font-bold text-blue-600 uppercase">Peso</th>
                                    <th className="px-3 py-2"></th> 
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-blue-100">
                                    {newWorkout.exercises.map((ex) => (
                                        <tr key={ex.tempId}>
                                            <td className="p-2">
                                                <input type="text" value={ex.name} onChange={(e) => handleUpdateExerciseRow(ex.tempId, 'name', e.target.value)} placeholder="Ej: Press Banca" 
                                                className="bg-white border border-gray-300 rounded py-1 px-2 w-full text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                                            </td>
                                            <td className="p-2">
                                                <input type="number" value={ex.sets} onChange={(e) => handleUpdateExerciseRow(ex.tempId, 'sets', parseInt(e.target.value) || '')} 
                                                className="bg-white border border-gray-300 rounded py-1 px-2 w-full text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                                            </td>
                                            <td className="p-2">
                                                <input type="number" value={ex.reps} onChange={(e) => handleUpdateExerciseRow(ex.tempId, 'reps', parseInt(e.target.value) || '')} 
                                                className="bg-white border border-gray-300 rounded py-1 px-2 w-full text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                                            </td>
                                            <td className="p-2">
                                                <input type="number" value={ex.weight} onChange={(e) => handleUpdateExerciseRow(ex.tempId, 'weight', parseFloat(e.target.value) || '')} 
                                                className="bg-white border border-gray-300 rounded py-1 px-2 w-full text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"/>
                                            </td>
                                            <td className="p-2 text-center">
                                                <button type="button" onClick={() => handleRemoveExerciseRow(ex.tempId)} className="text-red-400 hover:text-red-600 p-1 transition bg-red-50 hover:bg-red-100 rounded-full">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                    {newWorkout.exercises.length === 0 && (
                        <p className="text-blue-400 text-center py-4 text-sm italic">Presiona "Añadir Ejercicio" para comenzar.</p>
                    )}
                </div>

                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl shadow-lg text-lg font-bold text-white bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-300 transition transform hover:-translate-y-0.5"
                >
                  Guardar Sesión
                </button>
              </form>
            </div>

           {/* Lista de Entrenamientos (HistorySection refactorizado) */}
           <div className="
             w-full max-w-[42rem] mx-auto p-6
             bg-gradient-to-b from-white to-blue-50
             border-2 border-blue-200 rounded-2xl
             shadow-sm hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/15
             flex flex-col items-center transition-all duration-300 ease-in-out
           ">
              
              {/* Encabezado */}
              <div className="flex flex-col items-center w-full mb-6 gap-4 sm:flex-row sm:justify-between">
                <h2 className="text-2xl font-extrabold text-blue-800 text-center">Historial</h2>
                
                {/* Filtro */}
                <div className="flex items-center gap-2 bg-white py-1 px-3 rounded-full border border-blue-200 shadow-sm">
                  <label htmlFor="filterType" className="text-sm font-semibold text-blue-400 whitespace-nowrap">
                    Filtrar:
                  </label>
                  <select
                    id="filterType"
                    name="filterType"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="border-none bg-transparent text-blue-600 font-semibold text-sm cursor-pointer outline-none focus:text-blue-900 pr-2"
                  >
                    <option value="Todos">Todos</option>
                    {WORKOUT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Lista */}
              <div className="w-full space-y-3">
                {workoutsToDisplay.length === 0 ? (
                  <div className="text-center text-blue-300 italic py-8">
                    <p>
                      {filterType === 'Todos'
                        ? "Aún no hay registros."
                        : `No hay entrenamientos de "${filterType}".`
                      }
                    </p>
                  </div>
                ) : (
                  workoutsToDisplay.map((workout) => (
                    <WorkoutItem
                      key={workout.id}
                      workout={workout}
                      onDelete={handleDeleteWorkout}
                      onReuse={handleReuseWorkout} 
                    />
                  ))
                )}
              </div>
            </div>
          </>
      </div>
    </div>
  );
};
export default App;