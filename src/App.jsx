import React, { useState, useEffect, useMemo, useCallback } from 'react';
import StatCard from './components/StatCard';
import WorkoutItem from './components/WorkoutItem';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';
import { 
  getFirestore, collection, query, onSnapshot, addDoc, deleteDoc, updateDoc, doc, Timestamp, orderBy 
} from 'firebase/firestore';

// Importamos los JSON de idiomas 
import esLang from './locales/es.json';
import enLang from './locales/en.json';

// --- CONFIGURACIÓN ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};

const WORKOUT_TYPES = ['Correr', 'Ciclismo', 'Pesas', 'Yoga', 'Natación', 'Otro'];
const NEW_EXERCISE_TEMPLATE = { tempId: Date.now(), name: '', sets: '', reps: '', weight: '' };

// --- COMPONENTES AUXILIARES (MODALES Y WIDGETS) ---

// 1. Widget de Clima (Open-Meteo API - No requiere Key para uso básico)
const WeatherWidget = () => {
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
          const data = await res.json();
          setWeather(data.current_weather);
        } catch (e) {
          console.error("Error clima:", e);
        }
      });
    }
  }, []);

  if (!weather) return <span className="text-xs text-blue-200">...</span>;

  return (
    <div className="flex items-center gap-2 bg-white/20 p-2 rounded-lg backdrop-blur-sm text-white text-sm animate-fade-in">
      <span>🌡️ {weather.temperature}°C</span>
      <span>💨 {weather.windspeed} km/h</span>
    </div>
  );
};

// 2. Chat de OpenAI
const AIChatWidget = ({ isOpen, toggle, apiKey, setApiKey, t }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    if (!apiKey) {
      alert("Por favor ingresa una API Key de OpenAI primero (demo mode).");
      return;
    }
    
    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: "gpt-3.5-turbo",
          messages: [...messages, userMsg]
        })
      });
      const data = await res.json();
      if (data.choices && data.choices[0]) {
        setMessages(prev => [...prev, data.choices[0].message]);
      } else {
        throw new Error(data.error?.message || "Error API");
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'system', content: `Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return (
    <button onClick={toggle} className="fixed bottom-6 right-6 bg-blue-600 text-white p-4 rounded-full shadow-xl hover:bg-blue-700 transition z-50">
      💬 AI Coach
    </button>
  );

  return (
    <div className="fixed bottom-6 right-6 w-80 h-96 bg-white border border-blue-200 rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
      <div className="bg-blue-600 p-3 text-white flex justify-between items-center">
        <h3 className="font-bold">AI Coach 🤖</h3>
        <button onClick={toggle} className="text-white hover:text-gray-200">✕</button>
      </div>
      
      {!apiKey && (
        <div className="p-2 bg-yellow-50 text-xs border-b border-yellow-100">
           <input type="password" placeholder="OpenAI API Key (sk-...)" className="w-full p-1 border rounded" onChange={e => setApiKey(e.target.value)} />
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
        {messages.map((m, i) => (
          <div key={i} className={`p-2 rounded-lg text-sm max-w-[85%] ${m.role === 'user' ? 'bg-blue-100 ml-auto text-blue-900' : 'bg-white border text-gray-800'}`}>
            {m.content}
          </div>
        ))}
        {loading && <div className="text-xs text-gray-400 italic">Escribiendo...</div>}
      </div>

      <div className="p-3 border-t bg-white flex gap-2">
        <input 
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={t.chat_placeholder}
          className="flex-1 border rounded px-2 text-sm focus:outline-blue-500"
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} className="text-blue-600 font-bold text-sm">{t.chat_send}</button>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
const App = () => {
  // Estado Multilenguaje
  const [lang, setLang] = useState('es');
  const t = lang === 'es' ? esLang : enLang;

  // Estados Datos
  const [workouts, setWorkouts] = useState([]);
  const [editingId, setEditingId] = useState(null); // Para el UPDATE
  
  // Formulario
  const [newWorkout, setNewWorkout] = useState({
    title: '', type: WORKOUT_TYPES[0], duration: '', calories: '', date: new Date().toISOString().substring(0, 10), exercises: []
  });

  // Auth & System
  const [db, setDb] = useState(null);
  const [auth, setAuth] = useState(null);
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState('Todos');

  // UI Extras
  const [chatOpen, setChatOpen] = useState(false);
  const [openAIKey, setOpenAIKey] = useState('');

  // 1. Inicialización
  useEffect(() => {
    if (!Object.keys(firebaseConfig).length) {
      setError("Falta configuración de Firebase."); setLoading(false); return;
    }
    const app = initializeApp(firebaseConfig);
    const firestoreDb = getFirestore(app);
    const firebaseAuth = getAuth(app);
    setDb(firestoreDb);
    setAuth(firebaseAuth);

    const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Fetching
  useEffect(() => {
    if (!db || !user) return;
    const q = query(collection(db, `artifacts/${appId}/users/${user.uid}/workouts`), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, snap => {
      setWorkouts(snap.docs.map(d => ({ id: d.id, ...d.data(), date: d.data().timestamp?.toDate().toISOString().substring(0, 10) || 'N/A' })));
    });
    return () => unsub();
  }, [db, user]);

  // --- HANDLERS AUTH ---
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => signOut(auth);

  // --- HANDLERS CRUD ---
  const handleInputChange = (e) => setNewWorkout({ ...newWorkout, [e.target.name]: e.target.value });
  
  const handleAddOrUpdateWorkout = async (e) => {
    e.preventDefault();
    if (!newWorkout.title.trim()) return;

    const payload = {
      title: newWorkout.title,
      type: newWorkout.type,
      duration: parseInt(newWorkout.duration),
      calories: parseInt(newWorkout.calories),
      exercises: newWorkout.exercises.map(({ tempId, ...rest }) => rest),
      timestamp: Timestamp.fromDate(new Date(newWorkout.date))
    };

    try {
      if (editingId) {
        // UPDATE
        await updateDoc(doc(db, `artifacts/${appId}/users/${user.uid}/workouts`, editingId), payload);
        setEditingId(null);
      } else {
        // CREATE
        await addDoc(collection(db, `artifacts/${appId}/users/${user.uid}/workouts`), { ...payload, createdAt: Timestamp.now() });
      }
      // Reset form
      setNewWorkout({ title: '', type: WORKOUT_TYPES[0], duration: '', calories: '', date: new Date().toISOString().substring(0, 10), exercises: [] });
    } catch (e) { console.error(e); setError("Error saving data"); }
  };

  const handleDelete = async (id) => {
    if (confirm("¿Seguro?")) await deleteDoc(doc(db, `artifacts/${appId}/users/${user.uid}/workouts`, id));
  };

  const handleEdit = (workout) => {
    setNewWorkout({
      ...workout,
      // Restaurar tempIds para la UI
      exercises: workout.exercises.map(ex => ({ ...ex, tempId: Date.now() + Math.random() })) 
    });
    setEditingId(workout.id);
    document.getElementById('new-workout-form').scrollIntoView({ behavior: 'smooth' });
  };

  const handleExercisesOps = {
    add: () => setNewWorkout(p => ({ ...p, exercises: [...p.exercises, { ...NEW_EXERCISE_TEMPLATE, tempId: Date.now() }] })),
    update: (id, f, v) => setNewWorkout(p => ({ ...p, exercises: p.exercises.map(e => e.tempId === id ? { ...e, [f]: v } : e) })),
    remove: (id) => setNewWorkout(p => ({ ...p, exercises: p.exercises.filter(e => e.tempId !== id) }))
  };

  // --- PAYMENT MOCK ---
  const handlePayment = () => {
    // Simulación de redirección a Transbank / Webpay
    const confirmed = confirm("Te redirigiremos a Webpay (Simulación). ¿Proceder?");
    if (confirmed) {
      alert("Pago exitoso. ¡Gracias por suscribirte!");
      // Aquí iría la lógica real: window.location.href = '/api/init-transaction'
    }
  };

  // Cálculos
  const filteredWorkouts = useMemo(() => filterType === 'Todos' ? workouts : workouts.filter(w => w.type === filterType), [workouts, filterType]);
  const totals = useMemo(() => filteredWorkouts.reduce((acc, w) => ({ dur: acc.dur + (w.duration || 0), cal: acc.cal + (w.calories || 0) }), { dur: 0, cal: 0 }), [filteredWorkouts]);

  if (loading) return <div className="flex h-screen items-center justify-center text-blue-600">Loading...</div>;

  // --- LOGIN SCREEN ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
          <h2 className="text-2xl font-bold text-center text-blue-700 mb-6">{authMode === 'login' ? t.login : t.register}</h2>
          {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-2 rounded">{error}</p>}
          <form onSubmit={handleAuth} className="space-y-4">
            <input type="email" placeholder={t.email} className="w-full p-3 border rounded-lg" value={email} onChange={e => setEmail(e.target.value)} required />
            <input type="password" placeholder={t.password} className="w-full p-3 border rounded-lg" value={password} onChange={e => setPassword(e.target.value)} required />
            <button className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition">
              {authMode === 'login' ? t.login : t.register}
            </button>
          </form>
          <p className="text-center mt-4 text-sm text-gray-600 cursor-pointer hover:underline" onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}>
            {authMode === 'login' ? "¿No tienes cuenta? Regístrate" : "¿Ya tienes cuenta? Inicia Sesión"}
          </p>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      {/* HEADER */}
      <div className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-extrabold">{t.app_title}</h1>
            <WeatherWidget />
          </div>
          <div className="flex items-center gap-3">
             {/* Selector Idioma */}
            <select onChange={(e) => setLang(e.target.value)} value={lang} className="bg-blue-700 text-white text-sm border-none rounded p-1">
              <option value="es">🇪🇸 ES</option>
              <option value="en">🇺🇸 EN</option>
            </select>
            <button onClick={handlePayment} className="bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full hover:bg-yellow-300 transition">
              💎 Premium
            </button>
            <button onClick={handleLogout} className="bg-blue-800 text-xs px-3 py-1 rounded hover:bg-blue-900 transition">
              {t.logout}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 sm:p-8">
        
        {/* STATS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatCard title={t.total_workouts} value={workouts.length} />
          <StatCard title={t.total_duration} value={totals.dur} />
          <StatCard title={t.total_calories} value={totals.cal} />
        </div>

        {/* FORM (CREATE / UPDATE) */}
        <div id="new-workout-form" className="bg-white p-6 rounded-2xl shadow-lg border-2 border-blue-100 mb-8">
          <h2 className="text-xl font-bold text-blue-800 mb-4 text-center">
            {editingId ? t.edit_workout : t.new_workout}
          </h2>
          
          <form onSubmit={handleAddOrUpdateWorkout} className="space-y-4">
            <div>
              <label className="text-sm font-bold text-gray-700">{t.title_label}</label>
              <input name="title" value={newWorkout.title} onChange={handleInputChange} className="w-full border p-2 rounded" required />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <input type="date" name="date" value={newWorkout.date} onChange={handleInputChange} className="border p-2 rounded w-full" />
              <select name="type" value={newWorkout.type} onChange={handleInputChange} className="border p-2 rounded w-full">
                {WORKOUT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
              </select>
              <input type="number" name="duration" placeholder={t.duration} value={newWorkout.duration} onChange={handleInputChange} className="border p-2 rounded w-full" />
              <input type="number" name="calories" placeholder={t.calories} value={newWorkout.calories} onChange={handleInputChange} className="border p-2 rounded w-full" />
            </div>

            {/* EJERCICIOS */}
            <div className="bg-blue-50 p-4 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-blue-700 text-sm">{t.exercises}</h3>
                <button type="button" onClick={handleExercisesOps.add} className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded hover:bg-blue-300">
                  + {t.add_exercise}
                </button>
              </div>
              {newWorkout.exercises.map(ex => (
                <div key={ex.tempId} className="flex gap-2 mb-2">
                  <input placeholder="Nombre" value={ex.name} onChange={e => handleExercisesOps.update(ex.tempId, 'name', e.target.value)} className="flex-grow border p-1 rounded text-sm" />
                  <input placeholder="Series" type="number" value={ex.sets} onChange={e => handleExercisesOps.update(ex.tempId, 'sets', e.target.value)} className="w-16 border p-1 rounded text-sm" />
                  <input placeholder="Reps" type="number" value={ex.reps} onChange={e => handleExercisesOps.update(ex.tempId, 'reps', e.target.value)} className="w-16 border p-1 rounded text-sm" />
                  <button type="button" onClick={() => handleExercisesOps.remove(ex.tempId)} className="text-red-500">🗑️</button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button type="submit" className={`flex-1 py-3 rounded-xl font-bold text-white transition ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {editingId ? t.update : t.save}
              </button>
              {editingId && (
                <button type="button" onClick={() => { setEditingId(null); setNewWorkout({ title: '', type: WORKOUT_TYPES[0], duration: '', calories: '', date: new Date().toISOString().substring(0, 10), exercises: [] }); }} className="px-4 bg-gray-300 rounded-xl font-bold text-gray-700">
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* LISTA & FILTROS */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">{t.history}</h2>
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="border-none bg-white py-1 px-3 rounded-full shadow-sm text-sm">
            <option value="Todos">Todos</option>
            {WORKOUT_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>

        <div className="space-y-3">
          {filteredWorkouts.map(w => (
            <div key={w.id} className="relative group">
              <WorkoutItem workout={w} onDelete={handleDelete} onReuse={(w) => handleEdit(w)} />
              {/* Sobreescribimos el botón de reutilizar para que actúe como Editar en este contexto o agregamos uno nuevo */}
              <button 
                onClick={() => handleEdit(w)} 
                className="absolute top-4 right-12 text-orange-400 hover:text-orange-600 p-2 bg-white/80 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition"
                title="Editar"
              >
                ✏️
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* CHAT WIDGET */}
      <AIChatWidget isOpen={chatOpen} toggle={() => setChatOpen(!chatOpen)} apiKey={openAIKey} setApiKey={setOpenAIKey} t={t} />
      
    </div>
  );
};

export default App;