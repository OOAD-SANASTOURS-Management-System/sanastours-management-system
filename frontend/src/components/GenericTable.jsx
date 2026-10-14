import React from 'react';
import StatusBadge from './StatusBadge';

const GenericTable = ({ columns, data, onEdit, onView, onDelete }) => {
  return (
    <div className="overflow-x-auto overflow-y-hidden rounded-lg bg-white mt-6 border border-gray-200 no-scrollbar">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-200 border-b border-gray-300">
            {columns.map((col, index) => (
              <th key={index} className="px-2 py-3 text-sm font-semibold text-gray-700 whitespace-nowrap">
                {col.header}
              </th>
            ))}
            {(onView || onEdit || onDelete) && (
              <th className="px-2 py-3 text-sm font-semibold text-gray-700 text-center whitespace-nowrap ">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={rowIndex} className="hover:bg-gray-50 group">
                {columns.map((col, colIndex) => (
                  <td key={colIndex} className="px-2 py-4 text-sm text-gray-600 whitespace-nowrap">
                    {col.isStatus ? (
                      <StatusBadge status={row[col.accessor]} />
                    ) : (
                      row[col.accessor]
                    )}
                  </td>
                ))}
                {(onView || onEdit || onDelete) && (
                  <td className="px-2 py-4 text-sm ">
                    <div className="flex justify-center gap-2 whitespace-nowrap">
                      {onView && (
                        <button
                          onClick={() => onView(row)}
                          className="text-[#f97316] font-medium border border-[#f97316] px-2 py-1 rounded hover:bg-orange-50"
                        >
                          View
                        </button>
                      )}
                      {onEdit && (
                        <button
                          onClick={() => onEdit(row)}
                          className="text-[#f97316] font-medium border border-[#f97316] px-2 py-1 rounded hover:bg-orange-50"
                        >
                          Edit
                        </button>
                      )}
                      {onDelete && (
                        <button
                          onClick={() => onDelete(row)}
                          className="bg-[#ef4444] text-white font-medium border border-[#ef4444] px-2 py-1 rounded hover:bg-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            ))
          ) : (
            <tr>
              {/* Fix 6.15: the empty-state colSpan always added one for an
                  Actions column, even when no action handlers were passed. */}
              <td
                colSpan={columns.length + ((onView || onEdit || onDelete) ? 1 : 0)}
                className="px-4 py-8 text-center text-gray-500"
              >
                No records found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default GenericTable;
