import { useState } from 'react'
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  CircularProgress,
  Grid,
} from '@mui/material'
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import axios from 'axios'

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

function App() {
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [monthlyStats, setMonthlyStats] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setFile(event.target.files[0])
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first')
      return
    }

    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await axios.post('http://localhost:8000/api/upload-transactions', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      setMonthlyStats(response.data.monthly_stats)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'An error occurred while uploading the file')
    } finally {
      setLoading(false)
    }
  }

  const chartData = {
    labels: monthlyStats.map(stat => stat.month),
    datasets: [
      {
        label: 'Monthly Spending',
        data: monthlyStats.map(stat => stat.total_amount),
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
      },
    ],
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom align="center">
          Financial Planning Dashboard
        </Typography>

        <Paper sx={{ p: 3, mb: 4 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={8}>
              <input
                accept=".csv"
                style={{ display: 'none' }}
                id="raised-button-file"
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="raised-button-file">
                <Button variant="contained" component="span">
                  Select CSV File
                </Button>
              </label>
              {file && (
                <Typography variant="body1" sx={{ mt: 1 }}>
                  Selected file: {file.name}
                </Typography>
              )}
            </Grid>
            <Grid item xs={12} md={4}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleUpload}
                disabled={!file || loading}
                fullWidth
              >
                {loading ? <CircularProgress size={24} /> : 'Upload and Analyze'}
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {error && (
          <Paper sx={{ p: 2, mb: 4, bgcolor: '#ffebee' }}>
            <Typography color="error">{error}</Typography>
          </Paper>
        )}

        {monthlyStats.length > 0 && (
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Monthly Spending Analysis
            </Typography>
            <Box sx={{ height: 400 }}>
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'top' as const,
                    },
                    title: {
                      display: true,
                      text: 'Monthly Spending Trends',
                    },
                  },
                }}
              />
            </Box>
          </Paper>
        )}
      </Box>
    </Container>
  )
}

export default App
