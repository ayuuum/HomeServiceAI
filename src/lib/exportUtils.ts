import { format } from 'date-fns';

export interface ColumnConfig {
  key: string;
  header: string;
  formatter?: (value: any, row: any) => string;
}

/**
 * Format date to YYYY/MM/DD
 */
export const formatDateForExport = (date: string | Date | null | undefined): string => {
  if (!date) return '';
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'yyyy/MM/dd');
  } catch {
    return '';
  }
};

/**
 * Format currency as number only (for Excel calculations)
 */
export const formatCurrencyForExport = (amount: number | null | undefined): string => {
  if (amount === null || amount === undefined) return '0';
  return String(amount);
};

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
const escapeCSVValue = (value: any): string => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // If contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Convert object array to CSV string
 */
export const convertToCSV = <T extends Record<string, any>>(
  data: T[],
  columns: ColumnConfig[]
): string => {
  // Header row
  const headerRow = columns.map(col => escapeCSVValue(col.header)).join(',');
  
  // Data rows
  const dataRows = data.map(row => {
    return columns.map(col => {
      const value = row[col.key];
      const formattedValue = col.formatter ? col.formatter(value, row) : value;
      return escapeCSVValue(formattedValue);
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\r\n');
};

/**
 * Download CSV file with BOM for Japanese Excel compatibility
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  // Add BOM for UTF-8 Excel compatibility
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  
  // Create download link
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Cleanup
  URL.revokeObjectURL(url);
};

/**
 * Generate filename with today's date
 */
export const generateFilename = (prefix: string): string => {
  const today = format(new Date(), 'yyyy-MM-dd');
  return `${prefix}_${today}.csv`;
};

/**
 * Export data to CSV with auto-generated filename
 */
export const exportToCSV = <T extends Record<string, any>>(
  data: T[],
  columns: ColumnConfig[],
  filenamePrefix: string
): void => {
  const csvContent = convertToCSV(data, columns);
  const filename = generateFilename(filenamePrefix);
  downloadCSV(csvContent, filename);
};
