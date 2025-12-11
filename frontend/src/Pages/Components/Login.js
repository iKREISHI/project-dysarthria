import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Alert,
  AlertIcon,
  Flex,
  Stack,
  Text,
  Checkbox,
  InputRightElement,
  InputGroup,
  useColorModeValue,
} from "@chakra-ui/react";
import axiosConfig from './AxiosConfig';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

const Login = ({ setCurrentUser }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Заполните поля');
      return;
    }

    try {
      const response = await axiosConfig.post("/api/user/login/", { email, password });
      if (response.status === 200) {
        console.log('Login successful');
        setCurrentUser(true);
        localStorage.setItem('currentUser', JSON.stringify(true));
        navigate('/');
      } else {
        setError('Некорректные данные');
      }
    } catch (error) {
      console.error('Error logging in user: ', error);
      setError('Некорректные данные');
    }
  };

  return (
    <Flex minH={'100vh'} align={'center'} justify={'center'} bg={useColorModeValue('gray.50', 'gray.800')}>
      <Stack spacing={8} mx={'auto'} maxW={'lg'} w={'full'} py={12} px={6}>
        <Box rounded={'lg'} bg={useColorModeValue('white', 'gray.700')} boxShadow={'lg'} p={8}>
          <Stack spacing={4} >
            <form onSubmit={handleSubmit}>
              <FormControl id="formBasicEmail" mb="4">
                <FormLabel>Email</FormLabel>
                <Input type="email" placeholder="Введите Email" value={email} onChange={e => setEmail(e.target.value)} />
              </FormControl>
              <FormControl id="formBasicPassword" mb="4">
                <FormLabel>Пароль</FormLabel>
                <InputGroup>
                  <Input type={showPassword ? 'text' : 'password'} placeholder="Введите пароль" value={password} onChange={e => setPassword(e.target.value)} />
                  <InputRightElement h={'full'}>
                    <Button variant={'ghost'} onClick={() => setShowPassword((showPassword) => !showPassword)}>
                      {showPassword ? <ViewIcon /> : <ViewOffIcon />}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              <Stack spacing={10}>
                <Stack direction={{ base: 'column', sm: 'row' }} align={'start'} justify={'space-between'}>
                  <Checkbox>Запомнить меня</Checkbox>
                  <Link to="/profile/restore-password">
                    <Text color={'blue.400'}>Забыли пароль?</Text>
                  </Link>
                </Stack>
                {error && (
                  <Alert status="error" mb="4">
                    <AlertIcon />
                    {error}
                  </Alert>
                )}
                <Button type="submit" bg={'blue.400'} color={'white'} _hover={{ bg: 'blue.500', }}>Войти</Button>
              </Stack>
            </form>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
};

export default Login;