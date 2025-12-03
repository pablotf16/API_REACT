import React, { useState } from 'react';

const WorkoutItem = ({ workout, onDelete, onReuse }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasExercises = workout.exercises && workout.exercises.length > 0;

  return (
    <div className="
      bg-white p-5 mb-3 shadow-sm rounded-xl
      border border-gray-200 border-l-[6px] border-l-blue-200
      hover:border-blue-500 hover:border-l-blue-600 hover:bg-sky-50 
      hover:shadow-lg hover:shadow-blue-500/15 hover:scale-[1.01]
      transition-all duration-200 ease-in-out
    ">
      <div className="flex justify-between items-center">
        <div className="flex flex-col sm:flex-row sm:items-center space-y-1 sm:space-y-0 sm:space-x-4">
          <span className="text-xs font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
            {workout.date}
          </span>
          <span className="text-lg font-bold text-gray-800">
            {workout.title || workout.type}
          </span>
          <span className="text-sm text-gray-600">
            <span className="font-semibold">{workout.duration}</span> min |{' '}
            <span className="font-semibold">{workout.calories}</span> Kcal
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {hasExercises && (
            <button
              onClick={() => onReuse(workout)}
              className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-100 transition"
              title="Reutilizar este entrenamiento"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-copy-plus"><path d="M15 22H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h7l4 4v2"/><path d="M17 2v4h4"/><line x1="16" x2="16" y1="13" y2="19"/><line x1="13" x2="19" y1="16" y2="16"/></svg>
            </button>
          )}

          {hasExercises && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-blue-600 p-2 rounded-full hover:bg-gray-200 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${isExpanded ? 'rotate-180' : 'rotate-0'}`}><path d="m6 9 6 6 6-6"/></svg>
            </button>
          )}

          <button
            onClick={() => onDelete(workout.id)}
            className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
          </button>
        </div>
      </div>

      {isExpanded && hasExercises && (
        <div className="mt-4 border-t border-gray-200 pt-3">
          <h4 className="text-md font-semibold mb-2 text-gray-700">Detalle de Ejercicios:</h4>
          <div className="overflow-x-auto rounded-lg border-2 border-blue-50">
            <table className="min-w-full divide-y divide-gray-200 border-collapse">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Ejercicio</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Series</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Reps</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-600 uppercase">Peso</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workout.exercises.map((ex, index) => (
                  <tr key={ex.id ?? ex.tempId ?? index} className="hover:bg-blue-50">
                    <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{ex.name || 'N/A'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{ex.sets || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">{ex.reps || '-'}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-700">
                      {ex.weight ? `${ex.weight} ${ex.weight > 0 ? 'kg/lb' : ''}` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(WorkoutItem);