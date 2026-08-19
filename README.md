# challenge-fiap

## IA com Groq

Crie um arquivo `.env` baseado em `.env.example` e configure `EXPO_PUBLIC_GROQ_API_KEY`.
Depois reinicie o Expo para carregar a variável:

```powershell
npx expo start -c
```

O aplicativo usa o modelo `openai/gpt-oss-120b` para gerar resumos e exercícios a partir do texto do OCR. Se a variável não estiver configurada ou a rede falhar, ele usa o gerador offline de fallback.