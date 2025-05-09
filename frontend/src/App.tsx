import { Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import TransactionAnalysis from './components/TransactionAnalysis'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Container maxWidth="lg">
        <TransactionAnalysis />
      </Container>
    </ThemeProvider>
  )
}

export default App
