import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Button, 
  Card, 
  CardContent, 
  Typography, 
  CircularProgress,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Checkbox,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface Transaction {
  date: string;
  description: string;
  debit_amount: number | null;
  credit_amount: number | null;
}

interface AnalysisData {
  total_balance: number;
  total_income: number;
  total_expenses: number;
  monthly_patterns: {
    [key: string]: {
      credits: number;
      debits: number;
    };
  };
  category_breakdown: {
    [key: string]: number;
  };
  uploaded_files?: string[];
  analyzed_files?: string[];
  all_transactions: Transaction[];
}

interface UploadedFile {
  filename: string;
  path: string;
  uploaded_at: string;
}

interface DateRange {
  year: string;
  month: string;
}

const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF6B6B', '#4ECDC4', '#45B7D1'
];

const TransactionAnalysis: React.FC = () => {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [fullAnalysis, setFullAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
  });

  const calculateCategoryBreakdown = (transactions: Transaction[]) => {
    const breakdown: { [key: string]: number } = {};
    
    transactions.forEach(t => {
      const amount = t.debit_amount || t.credit_amount || 0;
      let category = 'Other';
      
      // Determine category based on description
      const desc = t.description.toUpperCase();
      if (desc.includes('SUPERMARKET') || desc.includes('T&T') || desc.includes('LUCKY') || desc.includes('MARKET')) {
        category = 'Groceries';
      } else if (desc.includes('RESTAURANT') || desc.includes('CAFE') || desc.includes('FOOD') || desc.includes('PHO') || desc.includes('UBER*EATS')) {
        category = 'Dining';
      } else if (desc.includes('UBER') || desc.includes('COMPASS') || desc.includes('TRANSIT') || desc.includes('PARKING')) {
        category = 'Transportation';
      } else if (desc.includes('WALMART') || desc.includes('COSTCO') || desc.includes('RETAIL') || desc.includes('AMZN')) {
        category = 'Shopping';
      } else if (desc.includes('BILL') || desc.includes('SERVICE CHARGE') || desc.includes('ROGERS') || desc.includes('INSURANCE')) {
        category = 'Bills';
      } else if (desc.includes('WEALTHSIMPLE') || desc.includes('QUESTRADE') || desc.includes('INVESTMENT')) {
        category = 'Investments';
      }
      
      breakdown[category] = (breakdown[category] || 0) + amount;
    });
    
    return breakdown;
  };

  // Calculate filtered analysis based on date range
  const analysis = useMemo(() => {
    if (!fullAnalysis) return null;

    // Filter transactions by date range
    const filteredTransactions = fullAnalysis.all_transactions.filter(t => {
      const [year, month] = t.date.split('-');
      return year === dateRange.year && month === dateRange.month;
    });

    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;
    filteredTransactions.forEach(t => {
      if (t.credit_amount) totalIncome += t.credit_amount;
      if (t.debit_amount) totalExpenses += t.debit_amount;
    });

    // Return filtered analysis
    return {
      ...fullAnalysis,
      total_income: totalIncome,
      total_expenses: totalExpenses,
      total_balance: totalIncome - totalExpenses,
      category_breakdown: calculateCategoryBreakdown(filteredTransactions)
    };
  }, [fullAnalysis, dateRange]);

  // Fetch existing files on component mount
  useEffect(() => {
    fetchUploadedFiles();
  }, []);

  const fetchUploadedFiles = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/transactions/files');
      if (!response.ok) {
        throw new Error('Failed to fetch files');
      }
      const data = await response.json();
      setUploadedFiles(data.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(event.target.files);
    }
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setError('Please select files first');
      return;
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    Array.from(files).forEach(file => {
      formData.append('files', file);
    });

    try {
      console.log('Uploading files...');
      const response = await fetch(
        'http://localhost:8000/api/transactions/upload',
        {
          method: 'POST',
          body: formData,
        }
      );

      const data = await response.json();
      console.log('Upload response:', data);

      if (!response.ok) {
        throw new Error(data.detail || 'Upload failed');
      }

      if (!data.all_transactions) {
        throw new Error('Invalid response format: missing transactions data');
      }

      setFullAnalysis(data);
      await fetchUploadedFiles();
      setFiles(null);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
      setFullAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (filename: string) => {
    try {
      const response = await fetch(`http://localhost:8000/api/transactions/files/${filename}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      await fetchUploadedFiles(); // Refresh file list
      setSelectedFiles(prev => prev.filter(f => !f.endsWith(filename)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    }
  };

  const handleAnalyzeSelected = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select files to analyze');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Analyzing files:', selectedFiles);
      const response = await fetch(
        'http://localhost:8000/api/transactions/analyze',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ file_paths: selectedFiles }),
        }
      );

      const data = await response.json();
      console.log('Analysis response:', data);

      if (!response.ok) {
        throw new Error(data.detail || 'Analysis failed');
      }

      if (!data.all_transactions) {
        throw new Error('Invalid response format: missing transactions data');
      }

      setFullAnalysis(data);
    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');
      setFullAnalysis(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelection = (path: string) => {
    setSelectedFiles(prev => 
      prev.includes(path)
        ? prev.filter(f => f !== path)
        : [...prev, path]
    );
  };

  const handleDateChange = (type: 'year' | 'month', value: string) => {
    setDateRange(prev => ({
      ...prev,
      [type]: value,
    }));
  };

  const getMonthName = (month: string) => {
    const date = new Date(2000, parseInt(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long' });
  };

  // Prepare data for charts
  const prepareCategoryData = () => {
    if (!analysis?.category_breakdown) return [];
    return Object.entries(analysis.category_breakdown)
      .filter(([category]) => category !== 'Investments') // Exclude investments
      .map(([name, value]) => ({
        name,
        value: Math.abs(value),
      }))
      .sort((a, b) => b.value - a.value);
  };

  const prepareMonthlyData = () => {
    if (!fullAnalysis?.monthly_patterns) return [];
    return Object.entries(fullAnalysis.monthly_patterns)
      .filter(([month]) => month.startsWith(dateRange.year))
      .map(([month, data]) => ({
        month: month.split('-')[1],
        income: data.credits,
        expenses: data.debits,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'grid', gap: 3 }}>
        <Box>
          <Card>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Upload and Manage Files</Typography>
                
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    component="label"
                  >
                    Select Files
                    <input
                      type="file"
                      multiple
                      accept=".csv"
                      hidden
                      onChange={handleFileChange}
                    />
                  </Button>
                  {files && (
                    <>
                      <Typography variant="body2">
                        {Array.from(files).map(f => f.name).join(', ')}
                      </Typography>
                      <Button
                        variant="contained"
                        color="primary"
                        onClick={handleUpload}
                        disabled={loading}
                      >
                        Upload
                      </Button>
                    </>
                  )}
                </Box>

                <Typography variant="subtitle1">Uploaded Files:</Typography>
                <List>
                  {uploadedFiles.map((file) => (
                    <ListItem key={file.path}>
                      <ListItemText
                        primary={file.filename}
                        secondary={new Date(file.uploaded_at).toLocaleString()}
                      />
                      <ListItemSecondaryAction>
                        <Checkbox
                          edge="start"
                          checked={selectedFiles.includes(file.path)}
                          onChange={() => handleFileSelection(file.path)}
                        />
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleDeleteFile(file.filename)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleAnalyzeSelected}
                    disabled={loading || selectedFiles.length === 0}
                    startIcon={<RefreshIcon />}
                  >
                    Analyze Selected Files
                  </Button>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        {analysis && (
          <>
            <Box>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    <FormControl>
                      <InputLabel>Year</InputLabel>
                      <Select
                        value={dateRange.year}
                        label="Year"
                        onChange={(e) => handleDateChange('year', e.target.value)}
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((year) => (
                          <MenuItem key={year} value={year}>{year}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <FormControl>
                      <InputLabel>Month</InputLabel>
                      <Select
                        value={dateRange.month}
                        label="Month"
                        onChange={(e) => handleDateChange('month', e.target.value)}
                      >
                        {Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0')).map((month) => (
                          <MenuItem key={month} value={month}>{getMonthName(month)}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Stack>

                  <Typography variant="h6" gutterBottom>
                    Financial Summary for {getMonthName(dateRange.month)} {dateRange.year}
                  </Typography>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 2 }}>
                    <Box>
                      <Typography variant="subtitle1">Total Income</Typography>
                      <Typography variant="h4" color="success.main">
                        ${analysis.total_income.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle1">Total Expenses</Typography>
                      <Typography variant="h4" color="error.main">
                        ${analysis.total_expenses.toFixed(2)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="subtitle1">Net Balance</Typography>
                      <Typography variant="h4" color={analysis.total_balance >= 0 ? "success.main" : "error.main"}>
                        ${analysis.total_balance.toFixed(2)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Monthly Income vs Expenses
                  </Typography>
                  <Box sx={{ width: '100%', height: 400 }}>
                    <ResponsiveContainer>
                      <BarChart data={prepareMonthlyData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="income" fill="#4caf50" name="Income" />
                        <Bar dataKey="expenses" fill="#f44336" name="Expenses" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Spending by Category for {getMonthName(dateRange.month)} {dateRange.year}
                  </Typography>
                  <Box sx={{ width: '100%', height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={prepareCategoryData()}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          label={(entry) => `${entry.name}: $${entry.value.toFixed(2)}`}
                        >
                          {prepareCategoryData().map((entry, index) => (
                            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </>
        )}

        {error && (
          <Box>
            <Alert severity="error">{error}</Alert>
          </Box>
        )}

        {loading && (
          <Box display="flex" justifyContent="center">
            <CircularProgress />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TransactionAnalysis; 