import React from 'react';

const StatCard = ({ title, value }) => (
  <div className="
    flex flex-col justify-center items-center text-center
    w-full max-w-[320px] mx-auto p-6
    bg-gradient-to-b from-white to-blue-50
    border-2 border-blue-200 rounded-2xl
    shadow-sm hover:shadow-lg hover:shadow-blue-500/20
    hover:-translate-y-1 hover:border-blue-500
    transition-all duration-300 ease-in-out
  ">
    <p className="text-blue-400 font-bold text-xs uppercase tracking-widest mb-2">
      {title}
    </p>
    <p className="text-blue-800 text-4xl font-extrabold leading-none">
      {value}
    </p>
  </div>
);

export default StatCard;