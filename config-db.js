// CONFIGURAÇÃO DO BANCO DE DADOS EM NUVEM (VAYKO LABS)
//
// Cole aqui as chaves de configuração do seu projeto Firebase.
// Se as chaves abaixo estiverem vazias ou com valores padrão,
// o sistema funcionará em modo "Demonstração Local" (usando localStorage).

const firebaseConfig = {
    apiKey: "",
    authDomain: "",
    projectId: "",
    storageBucket: "",
    messagingSenderId: "",
    appId: ""
};

// Indica se o Firebase deve ser ativado ou se rodará em LocalStorage
const USE_FIREBASE = firebaseConfig.apiKey !== "";
