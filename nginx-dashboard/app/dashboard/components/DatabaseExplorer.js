'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import SQLEditor from './SQLEditor';

export default function DatabaseExplorer({ className }) {
  const [isLoading, setIsLoading] = useState(true);
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(null);
  const [tableData, setTableData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    pageSize: 10,
    totalRows: 0,
  });
  const [editing, setEditing] = useState(null);
  const [editValues, setEditValues] = useState({});

  // Load available tables from actual database
  useEffect(() => {
    const fetchTables = async () => {
      try {
        // Fetch real tables from the database API
        const response = await fetch('/api/admin/tables');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch database tables: ${response.statusText}`);
        }
        
        const data = await response.json();
        setTables(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching tables:', error);
        setIsLoading(false);
        toast.error('Failed to fetch database tables');
      }
    };
    
    fetchTables();
  }, []);

  // Load table data when a table is selected
  useEffect(() => {
    if (!selectedTable) return;
    
    const fetchTableData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch real data from the database API - use selectedTable.name if it's an object
        const tableName = typeof selectedTable === 'object' ? selectedTable.name : selectedTable;
        const response = await fetch(`/api/admin/tables/${tableName}/data?page=${pagination.currentPage}&pageSize=${pagination.pageSize}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch table data: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Set columns and data from the real API response
        setColumns(data.columns);
        setTableData(data.rows);
        setPagination({
          ...pagination,
          totalPages: Math.ceil(data.totalRows / pagination.pageSize),
          totalRows: data.totalRows,
        });
        setIsLoading(false);
      } catch (error) {
        console.error(`Error fetching data for table ${tableName}:`, error);
        setIsLoading(false);
      }
    };
    
    fetchTableData();
  }, [selectedTable, pagination.currentPage, pagination.pageSize]);

  const handleTableSelect = (tableId) => {
    setSelectedTable(tableId);
    setPagination({...pagination, currentPage: 1});
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > pagination.totalPages) return;
    setPagination({...pagination, currentPage: newPage});
  };

  const startEdit = (row) => {
    setEditing(row.id);
    setEditValues({...row});
  };

  const cancelEdit = () => {
    setEditing(null);
    setEditValues({});
  };

  const saveEdit = async () => {
    try {
      // Get actual table name
      const tableName = typeof selectedTable === 'object' ? selectedTable.name : selectedTable;
      
      // Actual API call to update database row
      const response = await fetch(`/api/admin/tables/${tableName}/rows/${editValues.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update row: ${response.statusText}`);
      }
      
      // Update the local data
      setTableData(tableData.map(row => 
        row.id === editValues.id ? editValues : row
      ));
      
      // Clear editing state
      setEditing(null);
      setEditValues({});
      
      // Show success message
      toast.success('Row updated successfully');
    } catch (error) {
      console.error('Error updating row:', error);
      toast.error(`Update failed: ${error.message}`);
    }
  };

  const handleInputChange = (e, column) => {
    const value = column.type === 'number' ? Number(e.target.value) : 
                 column.type === 'boolean' ? e.target.checked :
                 e.target.value;
                 
    setEditValues({
      ...editValues,
      [column.id]: value
    });
  };

  // Format cell value for display
  const formatCellValue = (value, type) => {
    if (value === null || value === undefined) return '-';
    
    switch (type) {
      case 'datetime':
        return new Date(value).toLocaleString();
      case 'boolean':
        return value ? 'Yes' : 'No';
      default:
        return String(value);
    }
  };

  const [activeTab, setActiveTab] = useState('explorer'); // 'explorer' or 'query'
  
  return (
    <div className={`bg-white dark:bg-gray-800 shadow rounded-lg p-4 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm11 1H6v8l4-2 4 2V6z" clipRule="evenodd" />
          </svg>
          Database Management
        </h3>
        
        <div className="flex rounded-md shadow-sm">
          <button
            onClick={() => setActiveTab('explorer')}
            className={`px-4 py-2 text-sm font-medium rounded-l-md ${activeTab === 'explorer' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600'}`}
          >
            Data Explorer
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`px-4 py-2 text-sm font-medium rounded-r-md ${activeTab === 'query' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-y border-r border-gray-300 dark:border-gray-600'}`}
          >
            SQL Query
          </button>
        </div>
      </div>
      
      {activeTab === 'explorer' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Table List Sidebar */}
        <div className="md:col-span-3 border-b md:border-b-0 md:border-r border-gray-200 dark:border-gray-700 pb-4 md:pb-0 md:pr-4">
          <h4 className="font-medium text-sm text-gray-700 dark:text-gray-300 mb-2">Tables</h4>
          
          {isLoading && !tables.length ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          ) : (
            <ul className="space-y-1">
              {tables.map(table => (
                <li key={table.id}>
                  <button
                    onClick={() => handleTableSelect(table.name)}
                    className={`w-full text-left px-3 py-2 rounded text-sm flex justify-between items-center ${
                      selectedTable === table.name 
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span>{table.name}</span>
                    <span className="text-xs bg-gray-200 dark:bg-gray-600 rounded-full px-2 py-0.5">
                      {table.row_count.toLocaleString()}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button 
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              New Query
            </button>
          </div>
        </div>
        
        {/* Table Data */}
        <div className="md:col-span-9">
          {selectedTable ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                  {selectedTable} Table
                </h4>
                <div className="flex space-x-2">
                  <button className="text-xs px-2 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded hover:bg-indigo-200 dark:hover:bg-indigo-800">
                    Export
                  </button>
                  <button className="text-xs px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                    Add Row
                  </button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="animate-pulse space-y-3">
                  <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
                  ))}
                </div>
              ) : (
                <>
                  {/* Table */}
                  <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-800">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20">
                            Actions
                          </th>
                          {columns.map(column => (
                            <th 
                              key={column.id} 
                              scope="col" 
                              className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                            >
                              {column.name}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-800">
                        {tableData.map(row => (
                          <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                              {editing === row.id ? (
                                <div className="flex space-x-2">
                                  <button 
                                    onClick={saveEdit}
                                    className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                  <button 
                                    onClick={cancelEdit}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              ) : (
                                <div className="flex space-x-2">
                                  <button 
                                    onClick={() => startEdit(row)}
                                    className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button 
                                    onClick={async () => {
                                      if (window.confirm(`Are you sure you want to delete this row from ${selectedTable}?`)) {
                                        try {
                                          const tableName = typeof selectedTable === 'object' ? selectedTable.name : selectedTable;
                                          const response = await fetch(`/api/admin/tables/${tableName}/rows/${row.id}`, {
                                            method: 'DELETE'
                                          });
                                          
                                          if (!response.ok) {
                                            throw new Error(`Failed to delete row: ${response.statusText}`);
                                          }
                                          
                                          // Update local data by removing the row
                                          setTableData(tableData.filter(r => r.id !== row.id));
                                          toast.success('Row deleted successfully');
                                        } catch (error) {
                                          console.error('Error deleting row:', error);
                                          toast.error(`Delete failed: ${error.message}`);
                                        }
                                      }
                                    }}
                                    className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
                              )}
                            </td>
                            {columns.map(column => (
                              <td 
                                key={column.id} 
                                className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-200"
                              >
                                {editing === row.id && column.editable ? (
                                  column.type === 'boolean' ? (
                                    <input
                                      type="checkbox"
                                      checked={editValues[column.id] || false}
                                      onChange={(e) => handleInputChange(e, column)}
                                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                                    />
                                  ) : (
                                    <input
                                      type={column.type === 'number' ? 'number' : 'text'}
                                      value={editValues[column.id] || ''}
                                      onChange={(e) => handleInputChange(e, column)}
                                      className="block w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                                    />
                                  )
                                ) : (
                                  formatCellValue(row[column.id], column.type)
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Pagination */}
                  <div className="flex items-center justify-between mt-4">
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      Showing <span className="font-medium">{((pagination.currentPage - 1) * pagination.pageSize) + 1}</span> to{' '}
                      <span className="font-medium">{Math.min(pagination.currentPage * pagination.pageSize, pagination.totalRows)}</span> of{' '}
                      <span className="font-medium">{pagination.totalRows}</span> results
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handlePageChange(pagination.currentPage - 1)}
                        disabled={pagination.currentPage === 1}
                        className={`px-3 py-1 rounded text-sm ${
                          pagination.currentPage === 1
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(pagination.currentPage + 1)}
                        disabled={pagination.currentPage === pagination.totalPages}
                        className={`px-3 py-1 rounded text-sm ${
                          pagination.currentPage === pagination.totalPages
                            ? 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed'
                            : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
              <p className="text-gray-600 dark:text-gray-400 text-center max-w-sm">
                Select a table from the list to view and edit its data
              </p>
            </div>
          )}
        </div>
      </div>
      ) : (
        <SQLEditor />
      )}
    </div>
  );
}