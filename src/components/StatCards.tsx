import React from 'react';
import { toBengaliNumber } from '../lib/bengaliUtils';
import { mockStatCards, StatItem } from '../data/mock';

interface StatCardsProps {
  stats?: StatItem[];
}

export const StatCards: React.FC<StatCardsProps> = ({ stats = mockStatCards }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
      {stats.map((stat) => {
        const isFirst = stat.id === 'wheat-purchase';
        return (
          <div
            key={stat.id}
            style={{
              boxShadow: `0 6px 16px -4px ${stat.shadowColor}`,
            }}
            className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${stat.bgGradient} p-3 sm:p-4 text-white transition-all duration-200 active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-lg ${
              isFirst ? 'col-span-2 md:col-span-1' : 'col-span-1'
            }`}
          >
            <div className="flex items-center gap-2.5 sm:gap-3.5">
              {/* Icon Container */}
              <div className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur-xs text-white shadow-inner">
                {stat.iconName === 'wheat' && (
                  <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-white">
                    <path
                      d="M12 2C12 2 13.5 6 12 9C10.5 6 12 2 12 2Z"
                      fill="currentColor"
                    />
                    <path
                      d="M9.5 5C9.5 5 11 8 8.5 10C7.5 8 9.5 5 9.5 5Z"
                      fill="currentColor"
                    />
                    <path
                      d="M14.5 5C14.5 5 13 8 15.5 10C16.5 8 14.5 5 14.5 5Z"
                      fill="currentColor"
                    />
                    <path
                      d="M8 9.5C8 9.5 10.5 12 7.5 14C6.5 11.5 8 9.5 8 9.5Z"
                      fill="currentColor"
                    />
                    <path
                      d="M16 9.5C16 9.5 13.5 12 16.5 14C17.5 11.5 16 9.5 16 9.5Z"
                      fill="currentColor"
                    />
                    <path
                      d="M6.5 14C6.5 14 9.5 16 6.5 18C5.5 15.5 6.5 14 6.5 14Z"
                      fill="currentColor"
                    />
                    <path
                      d="M17.5 14C17.5 14 14.5 16 17.5 18C18.5 15.5 17.5 14 17.5 14Z"
                      fill="currentColor"
                    />
                    <path
                      d="M12 9V22"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                {stat.iconName === 'gear' && (
                  <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7 text-white">
                    <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                    <path
                      fillRule="evenodd"
                      d="M1.323 11.447C2.811 6.976 7.028 3.75 12.001 3.75c4.97 0 9.185 3.223 10.675 7.69.12.362.12.752 0 1.113-1.487 4.471-5.705 7.697-10.677 7.697-4.97 0-9.186-3.223-10.675-7.69a1.762 1.762 0 010-1.113zM17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}

                {stat.iconName === 'sack-blue' && (
                  <div className="relative flex flex-col items-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-white">
                      <path d="M7 6c0-1.1.9-2 2-2h6a2 2 0 012 2c0 .6-.2 1.1-.6 1.5l1.6 3.2c.6 1.2 1 2.5 1 3.8 0 4.1-3.1 7.5-7 7.5s-7-3.4-7-7.5c0-1.3.4-2.6 1-3.8L6.6 7.5C6.2 7.1 6 6.6 6 6z" />
                    </svg>
                    <span className="absolute bottom-1.5 text-[8px] font-extrabold text-sky-800 leading-none">
                      আটা
                    </span>
                  </div>
                )}

                {stat.iconName === 'sack-purple' && (
                  <div className="relative flex flex-col items-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-white">
                      <path d="M7 6c0-1.1.9-2 2-2h6a2 2 0 012 2c0 .6-.2 1.1-.6 1.5l1.6 3.2c.6 1.2 1 2.5 1 3.8 0 4.1-3.1 7.5-7 7.5s-7-3.4-7-7.5c0-1.3.4-2.6 1-3.8L6.6 7.5C6.2 7.1 6 6.6 6 6z" />
                    </svg>
                    <span className="absolute bottom-1.5 text-[8px] font-extrabold text-purple-900 leading-none">
                      ময়দা
                    </span>
                  </div>
                )}

                {stat.iconName === 'sack-teal' && (
                  <div className="relative flex flex-col items-center">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-white">
                      <path d="M7 6c0-1.1.9-2 2-2h6a2 2 0 012 2c0 .6-.2 1.1-.6 1.5l1.6 3.2c.6 1.2 1 2.5 1 3.8 0 4.1-3.1 7.5-7 7.5s-7-3.4-7-7.5c0-1.3.4-2.6 1-3.8L6.6 7.5C6.2 7.1 6 6.6 6 6z" />
                    </svg>
                    <span className="absolute bottom-1.5 text-[8px] font-extrabold text-teal-900 leading-none">
                      ভুসি
                    </span>
                  </div>
                )}
              </div>

              {/* Title & Value Text */}
              <div className="flex flex-col">
                <span className="text-xs font-medium text-white/90 leading-tight">
                  {stat.title}
                </span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-white">
                    {toBengaliNumber(stat.value.toLocaleString())}
                  </span>
                  <span className="text-xs font-semibold text-white/90">
                    {stat.unit}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
