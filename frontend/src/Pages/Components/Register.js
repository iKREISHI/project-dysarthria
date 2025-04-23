import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  Flex,
  Stack,
  Alert,
  AlertIcon,
  InputGroup,
  InputRightElement,
  useColorModeValue,
} from "@chakra-ui/react";
import axiosConfig from './AxiosConfig';
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password1, setPassword1] = useState('');
  const [password2, setPassword2] = useState('');
  const [lastName, setLastName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [showPassword1, setShowPassword1] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email || !password1 || !password2) {
      setError('Заполните все обязательные поля');
      return;
    } else if (password1 !== password2) {
      setError('Пароли не совпадают');
      return;
    } else if (password1.length < 8) {
      setError('Пароль должен состоять минимум из 8 символов');
      return;
    } else if (password1 === password1.toLowerCase()) {
      setError('В пароле должна быть хотя бы одна заглавная буква');
      return;
    }

    try {
      await axiosConfig.post("/api/user/register/", {
        email: email,
        last_name: lastName,
        first_name: firstName,
        patronymic: patronymic,
        password: password1,
      });
      navigate('/profile/confirmation');
    } catch (error) {
      setError('Некорректный Email');
      console.error('Error registering new user: ', error);
    }
  };

  return (
    <Flex minH={'100vh'} align={'center'} justify={'center'} bg={useColorModeValue('gray.50', 'gray.800')}>
      <Stack spacing={8} mx={'auto'} maxW={'lg'} w={'full'} py={12} px={6}>
        <Box rounded={'lg'} bg={useColorModeValue('white', 'gray.700')} boxShadow={'lg'} p={8}>
          <Stack spacing={4} >
            <form onSubmit={handleSubmit}>
              <FormControl id="formBasicEmail" mb="4" isRequired>
                <FormLabel>Email</FormLabel>
                <Input type="email" placeholder="Введите Email" value={email} onChange={e => setEmail(e.target.value)} />
              </FormControl>
              <FormControl id="formBasicLastName" mb="4">
                <FormLabel>Фамилия</FormLabel>
                <Input type="text" placeholder="Введите фамилию" value={lastName} onChange={e => setLastName(e.target.value)} />
              </FormControl>
              <FormControl id="formBasicFirstName" mb="4">
                <FormLabel>Имя</FormLabel>
                <Input type="text" placeholder="Введите имя" value={firstName} onChange={e => setFirstName(e.target.value)} />
              </FormControl>
              <FormControl id="formBasicPatronimyc" mb="4">
                <FormLabel>Отчетсво</FormLabel>
                <Input type="text" placeholder="Введите отчество" value={patronymic} onChange={e => setPatronymic(e.target.value)} />
              </FormControl>
              <FormControl id="formBasicPassword" mb="4" isRequired>
                <FormLabel>Пароль</FormLabel>
                <InputGroup>
                  <Input type={showPassword1 ? 'text' : 'password'} placeholder="Введите пароль" value={password1} onChange={e => setPassword1(e.target.value)} />
                  <InputRightElement h={'full'}>
                    <Button variant={'ghost'} onClick={() => setShowPassword1((showPassword1) => !showPassword1)}>
                      {showPassword1 ? <ViewIcon /> : <ViewOffIcon />}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              <FormControl id="formBasicPassword2" mb="4" isRequired>
                <FormLabel>Подтверждение пароля</FormLabel>
                <InputGroup>
                  <Input type={showPassword2 ? 'text' : 'password'} placeholder="Подтвердите пароль" value={password2} onChange={e => setPassword2(e.target.value)} />
                  <InputRightElement h={'full'}>
                    <Button variant={'ghost'} onClick={() => setShowPassword2((showPassword2) => !showPassword2)}>
                      {showPassword2 ? <ViewIcon /> : <ViewOffIcon />}
                    </Button>
                  </InputRightElement>
                </InputGroup>
              </FormControl>
              <Stack spacing={10}>
                {error && (
                  <Alert status="error" mb="4">
                    <AlertIcon />
                    {error}
                  </Alert>
                )}
                <Button type="submit" bg={'blue.400'} color={'white'} _hover={{ bg: 'blue.500', }}>Зарегистрироваться</Button>
              </Stack>
            </form>
          </Stack>
        </Box>
      </Stack>
    </Flex>
  );
};

export default Register;