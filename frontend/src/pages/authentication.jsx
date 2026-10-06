import * as React from 'react';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import Box from '@mui/material/Box';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import { Snackbar } from '@mui/material';
import { AuthContext } from '../contexts/AuthContext';

const defaultTheme = createTheme();

export default function Authentication() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [name, setName] = React.useState('');
  const [error, setError] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [formState, setFormState] = React.useState(0); // 0 = login, 1 = signup
  const [open, setOpen] = React.useState(false);

  const { handleRegister, handleLogin } = React.useContext(AuthContext);

  const handleAuth = async () => {
    try {
      if (formState === 0) {
        await handleLogin(username, password);
      } else {
        const result = await handleRegister(name, username, password);
        setMessage(result);
        setOpen(true);
        setFormState(0);
        setPassword('');
        setUsername('');
        setError('');
      }
    } catch (err) {
      setError(err?.response?.data?.message || 'Something went wrong');
    }
  };

  return (
    <ThemeProvider theme={defaultTheme}>
      {/* ✅ Full background image from public folder */}
      <Box
        sx={{
          height: '100vh',
          backgroundImage: 'url("/bgss.jpg")', // ✅ correct file path
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Semi-transparent white box for form */}
        <Paper
  elevation={6}
  sx={{
    p: 4,
    width: { xs: '90%', sm: '70%', md: '35%' },
    backdropFilter: 'blur(10px)',
    backgroundColor: 'rgba(255, 249, 249, 0.3)', // transparent white
    borderRadius: 3,
  }}
>
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Avatar sx={{ m: 1, bgcolor: 'secondary.main' }}>
              <LockOutlinedIcon />
            </Avatar>

            {/* Sign In / Sign Up buttons */}
            <Box sx={{ mb: 2 }}>
              <Button
                variant={formState === 0 ? 'contained' : 'outlined'}
                sx={{ mr: 1 }}
                onClick={() => setFormState(0)}
              >
                Sign In
              </Button>
              <Button
                variant={formState === 1 ? 'contained' : 'outlined'}
                onClick={() => setFormState(1)}
              >
                Sign Up
              </Button>
            </Box>

            {/* Form fields */}
            <Box component="form" noValidate sx={{ mt: 1 }}>
              {formState === 1 && (
                <TextField
                  margin="normal"
                  required
                  fullWidth
                  label="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                label="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />

              {/* Error message */}
              {error && <p style={{ color: 'red', marginTop: '5px' }}>{error}</p>}

              <Button
                fullWidth
                variant="contained"
                sx={{ mt: 3, mb: 2 }}
                onClick={handleAuth}
              >
                {formState === 0 ? 'Login' : 'Register'}
              </Button>
            </Box>
          </Box>
        </Paper>

        {/* Snackbar notification */}
        <Snackbar open={open} autoHideDuration={4000} message={message} />
      </Box>
    </ThemeProvider>
  );
}
