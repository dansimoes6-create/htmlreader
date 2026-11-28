'use strict';
// ===== Dados do jogo =====
const NAMES = {
  pt: { m: 'Miguel Arthur Gael Heitor Theo Davi Gabriel Bernardo Samuel João Pedro Lucas Rafael Enzo Guilherme Matheus Gustavo Felipe Tiago Bruno André Diego Leonardo Caio Vinícius Rodrigo Eduardo Daniel Henrique Otávio Ícaro Joaquim Benício Murilo Lorenzo'.split(' '),
        f: 'Helena Alice Laura Maria Valentina Heloísa Sophia Manuela Júlia Lívia Cecília Isabela Beatriz Mariana Gabriela Larissa Camila Fernanda Letícia Ana Clara Luana Yasmin Bianca Carolina Rafaela Natália Lorena Bruna Elisa Aurora Antonella Lara Mirela Jade'.split(' '),
        l: 'Silva Santos Oliveira Souza Rodrigues Ferreira Alves Pereira Lima Gomes Costa Ribeiro Martins Carvalho Almeida Lopes Soares Fernandes Vieira Barbosa Rocha Dias Nascimento Andrade Moreira Nunes Marques Machado Mendes Freitas Cardoso Ramos Teixeira Correia Pinto Moura Cavalcanti Monteiro Azevedo Batista Bragança Siqueira Prado'.split(' ') },
  en: { m: 'James Oliver Liam Noah William Henry Jack Lucas Benjamin Ethan Mason Logan Jacob Michael Daniel Samuel Owen Wyatt Caleb Ryan Nathan Dylan Connor Tyler Austin'.split(' '),
        f: 'Olivia Emma Charlotte Amelia Sophia Mia Isabella Ava Evelyn Harper Emily Abigail Ella Grace Chloe Lily Hannah Madison Zoe Nora Scarlett Ruby Audrey Claire Megan'.split(' '),
        l: 'Smith Johnson Williams Brown Jones Miller Davis Wilson Anderson Taylor Thomas Moore Martin Jackson White Harris Clark Lewis Walker Hall Young King Wright Scott Green Baker Adams Nelson Hill Campbell'.split(' ') },
  es: { m: 'Santiago Mateo Sebastián Diego Alejandro Nicolás Daniel Javier Carlos Luis Miguel Pablo Andrés Hugo Álvaro Adrián Manuel Jorge Rafael Emilio'.split(' '),
        f: 'Sofía Lucía Valentina Camila Isabella Martina Paula Elena Daniela Carmen Valeria Gabriela Ximena Renata Julieta Mariana Alba Noa Inés Claudia'.split(' '),
        l: 'García Rodríguez Martínez López González Hernández Pérez Sánchez Ramírez Torres Flores Rivera Gómez Díaz Morales Ortiz Castillo Romero Ruiz Vargas'.split(' ') },
  fr: { m: 'Gabriel Louis Raphaël Jules Adam Lucas Léo Hugo Arthur Nathan Paul Théo Antoine Mathis Victor'.split(' '),
        f: 'Louise Jade Emma Alice Chloé Léa Manon Camille Inès Juliette Zoé Margaux Clara Élise Anaïs'.split(' '),
        l: 'Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent Lefebvre Michel Garnier Rousseau Fontaine Chevalier'.split(' ') },
  de: { m: 'Lukas Leon Finn Paul Jonas Felix Elias Maximilian Noah Ben Luis Moritz Jakob Tim Niklas'.split(' '),
        f: 'Mia Emma Hannah Sophia Lea Lina Marie Anna Lena Clara Laura Greta Ida Frieda Paula'.split(' '),
        l: 'Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Koch Richter Wolf Klein Neumann Braun Zimmermann Krüger'.split(' ') },
  it: { m: 'Leonardo Francesco Alessandro Lorenzo Mattia Andrea Gabriele Riccardo Tommaso Edoardo Marco Giuseppe Luca Matteo Davide'.split(' '),
        f: 'Sofia Giulia Aurora Alice Ginevra Emma Giorgia Beatrice Chiara Martina Francesca Elena Sara Bianca Vittoria'.split(' '),
        l: 'Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti Costa Giordano Mancini Lombardi'.split(' ') },
  ja: { m: 'Haruto Sota Yuto Ren Hinata Riku Kaito Takumi Daiki Kenji Hiroshi Takeshi Yuki Sora Kenta'.split(' '),
        f: 'Yui Hina Sakura Aoi Rin Mei Yuna Akari Haruka Emi Keiko Naomi Ayumi Mio Kaede'.split(' '),
        l: 'Sato Suzuki Takahashi Tanaka Watanabe Ito Yamamoto Nakamura Kobayashi Kato Yoshida Yamada Sasaki Matsumoto Inoue'.split(' ') },
  zh: { m: 'Wei Hao Jun Lei Ming Tao Yang Jian Bo Chen Long Peng Qiang Zhen Kai'.split(' '),
        f: 'Mei Li Xiu Ying Fang Lan Jing Hui Yan Na Lin Qing Xin Yu Hua'.split(' '),
        l: 'Wang Li Zhang Liu Chen Yang Huang Zhao Wu Zhou Xu Sun Ma Zhu Hu Guo Lin He'.split(' ') },
  hi: { m: 'Aarav Vihaan Arjun Reyansh Sai Krishna Ishaan Rohan Rahul Vikram Aditya Karan Dev Ravi Amit'.split(' '),
        f: 'Saanvi Aanya Diya Ananya Priya Isha Kavya Meera Riya Pooja Neha Anjali Lakshmi Sita Aditi'.split(' '),
        l: 'Sharma Patel Singh Kumar Gupta Reddy Verma Joshi Mehta Nair Iyer Rao Das Kapoor Chopra'.split(' ') },
  ar: { m: 'Mohammed Ahmed Omar Ali Youssef Khalid Hassan Ibrahim Faisal Abdullah Tariq Karim Nasser Salman Zayed'.split(' '),
        f: 'Fatima Aisha Maryam Noor Layla Sara Huda Amira Yasmin Leila Zainab Salma Rania Dana Lina'.split(' '),
        l: 'Al-Harbi Al-Qahtani Al-Ghamdi Al-Zahrani Haddad Mansour Nasser Khalil Saleh Hamdan Farouk Aziz Rahman Hakim Al-Mutairi'.split(' ') },
  sv: { m: 'William Liam Noah Hugo Oscar Lucas Elias Axel Erik Nils Oliver Leo Viktor Anton Gustav'.split(' '),
        f: 'Alice Maja Elsa Astrid Wilma Freja Ebba Ella Saga Selma Linnea Ingrid Klara Agnes Stella'.split(' '),
        l: 'Andersson Johansson Karlsson Nilsson Eriksson Larsson Olsson Persson Svensson Gustafsson Lindberg Lindqvist Berg Holm Ek'.split(' ') }
};

// pl = nível de preços (multiplica salários e preços base), rate = câmbio para exibição
const COUNTRIES = [
  { id: 'br', n: 'Brasil', f: '🇧🇷', lang: 'pt', cur: 'R$', rate: 5, pl: .35, tax: .2, health: true, uni: true, drive: 18, drink: 18, cities: ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Recife', 'Fortaleza', 'Curitiba', 'Porto Alegre', 'Brasília', 'Manaus', 'Florianópolis', 'Belém', 'Goiânia'] },
  { id: 'pt', n: 'Portugal', f: '🇵🇹', lang: 'pt', cur: '€', rate: .92, pl: .6, tax: .28, health: true, uni: false, drive: 18, drink: 18, cities: ['Lisboa', 'Porto', 'Braga', 'Coimbra', 'Faro', 'Aveiro', 'Funchal'] },
  { id: 'us', n: 'Estados Unidos', f: '🇺🇸', lang: 'en', cur: 'US$', rate: 1, pl: 1, tax: .25, health: false, uni: false, drive: 16, drink: 21, death: true, cities: ['Nova York', 'Los Angeles', 'Chicago', 'Houston', 'Miami', 'Seattle', 'Boston', 'Las Vegas', 'Atlanta', 'Denver'] },
  { id: 'uk', n: 'Reino Unido', f: '🇬🇧', lang: 'en', cur: '£', rate: .78, pl: .85, tax: .3, health: true, uni: false, drive: 17, drink: 18, mon: { abs: false }, cities: ['Londres', 'Manchester', 'Liverpool', 'Edimburgo', 'Birmingham', 'Bristol'] },
  { id: 'ca', n: 'Canadá', f: '🇨🇦', lang: 'en', cur: 'C$', rate: 1.36, pl: .9, tax: .3, health: true, uni: false, drive: 16, drink: 19, cities: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'] },
  { id: 'au', n: 'Austrália', f: '🇦🇺', lang: 'en', cur: 'A$', rate: 1.5, pl: .95, tax: .3, health: true, uni: false, drive: 17, drink: 18, cities: ['Sydney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaide'] },
  { id: 'es', n: 'Espanha', f: '🇪🇸', lang: 'es', cur: '€', rate: .92, pl: .65, tax: .3, health: true, uni: false, drive: 18, drink: 18, mon: { abs: false }, cities: ['Madri', 'Barcelona', 'Valência', 'Sevilha', 'Bilbao', 'Málaga'] },
  { id: 'mx', n: 'México', f: '🇲🇽', lang: 'es', cur: 'MX$', rate: 17, pl: .3, tax: .2, health: false, uni: true, drive: 18, drink: 18, cities: ['Cidade do México', 'Guadalajara', 'Monterrey', 'Cancún', 'Puebla'] },
  { id: 'ar', n: 'Argentina', f: '🇦🇷', lang: 'es', cur: 'AR$', rate: 900, pl: .25, tax: .25, health: true, uni: true, drive: 17, drink: 18, cities: ['Buenos Aires', 'Córdoba', 'Rosário', 'Mendoza'] },
  { id: 'fr', n: 'França', f: '🇫🇷', lang: 'fr', cur: '€', rate: .92, pl: .8, tax: .35, health: true, uni: true, drive: 18, drink: 18, cities: ['Paris', 'Lyon', 'Marselha', 'Nice', 'Toulouse', 'Bordeaux'] },
  { id: 'de', n: 'Alemanha', f: '🇩🇪', lang: 'de', cur: '€', rate: .92, pl: .85, tax: .35, health: true, uni: true, drive: 18, drink: 16, cities: ['Berlim', 'Munique', 'Hamburgo', 'Colônia', 'Frankfurt'] },
  { id: 'it', n: 'Itália', f: '🇮🇹', lang: 'it', cur: '€', rate: .92, pl: .7, tax: .33, health: true, uni: false, drive: 18, drink: 18, cities: ['Roma', 'Milão', 'Nápoles', 'Turim', 'Florença', 'Veneza'] },
  { id: 'jp', n: 'Japão', f: '🇯🇵', lang: 'ja', cur: '¥', rate: 150, pl: .8, tax: .3, health: true, uni: false, drive: 18, drink: 20, death: true, mon: { abs: false, emp: true }, cities: ['Tóquio', 'Osaka', 'Kyoto', 'Sapporo', 'Nagoya', 'Fukuoka'] },
  { id: 'cn', n: 'China', f: '🇨🇳', lang: 'zh', cur: '¥', rate: 7.2, pl: .35, tax: .2, health: false, uni: false, drive: 18, drink: 18, death: true, noElect: true, cities: ['Pequim', 'Xangai', 'Cantão', 'Shenzhen', 'Chengdu'] },
  { id: 'in', n: 'Índia', f: '🇮🇳', lang: 'hi', cur: '₹', rate: 83, pl: .15, tax: .2, health: false, uni: false, drive: 18, drink: 21, death: true, arranged: true, cities: ['Mumbai', 'Nova Délhi', 'Bangalore', 'Chennai', 'Calcutá', 'Jaipur'] },
  { id: 'sa', n: 'Arábia Saudita', f: '🇸🇦', lang: 'ar', cur: 'SAR', rate: 3.75, pl: .7, tax: 0, health: true, uni: true, drive: 18, drink: 99, death: true, arranged: true, noElect: true, mon: { abs: true }, cities: ['Riad', 'Jidá', 'Dammam', 'Medina'] },
  { id: 'se', n: 'Suécia', f: '🇸🇪', lang: 'sv', cur: 'kr', rate: 10.5, pl: .85, tax: .4, health: true, uni: true, drive: 18, drink: 18, mon: { abs: false }, cities: ['Estocolmo', 'Gotemburgo', 'Malmö', 'Uppsala'] },
  { id: 'ao', n: 'Angola', f: '🇦🇴', lang: 'pt', cur: 'Kz', rate: 830, pl: .15, tax: .15, health: false, uni: false, drive: 18, drink: 18, cities: ['Luanda', 'Huambo', 'Benguela', 'Lubango'] },
  { id: 'mz', n: 'Moçambique', f: '🇲🇿', lang: 'pt', cur: 'MT', rate: 64, pl: .12, tax: .15, health: false, uni: false, drive: 18, drink: 18, cities: ['Maputo', 'Beira', 'Nampula'] }
];

const ZODIAC = [['Capricórnio', 1, 19], ['Aquário', 2, 18], ['Peixes', 3, 20], ['Áries', 4, 19], ['Touro', 5, 20], ['Gêmeos', 6, 20], ['Câncer', 7, 22], ['Leão', 8, 22], ['Virgem', 9, 22], ['Libra', 10, 22], ['Escorpião', 11, 21], ['Sagitário', 12, 21], ['Capricórnio', 12, 31]];
function zodiac(d, m) { for (const [n, mm, dd] of ZODIAC) if (m < mm || (m === mm && d <= dd)) return n; return 'Capricórnio'; }

const TALENTS = [
  { id: 'arte', n: 'Artes', d: 'Bônus em atuação e cinema' },
  { id: 'musica', n: 'Música', d: 'Aprende instrumentos mais rápido' },
  { id: 'esporte', n: 'Esportes', d: 'Atletismo sobe mais rápido' },
  { id: 'intelecto', n: 'Intelecto', d: 'Inteligência sobe mais rápido' },
  { id: 'carisma', n: 'Carisma', d: 'Mais sucesso em política e romance' },
  { id: 'negocios', n: 'Negócios', d: 'Empresas lucram mais' },
  { id: 'beleza', n: 'Beleza', d: 'Aparência envelhece devagar' },
  { id: 'lutas', n: 'Lutas', d: 'Bônus como lutador' },
  { id: 'crime', n: 'Malandragem', d: 'Crimes têm mais chance de sucesso' }
];

const RELIGIONS = ['Catolicismo', 'Protestantismo', 'Espiritismo', 'Judaísmo', 'Islamismo', 'Budismo', 'Hinduísmo', 'Siquismo', 'Xintoísmo', 'Umbanda', 'Candomblé', 'Taoismo', 'Agnosticismo', 'Ateísmo'];

const MAJORS = ['Administração', 'Arquitetura', 'Artes', 'Biologia', 'Ciência da Computação', 'Ciência Política', 'Cinema', 'Comunicação', 'Contabilidade', 'Criminologia', 'Design', 'Economia', 'Educação', 'Educação Física', 'Engenharia', 'Filosofia', 'Finanças', 'Física', 'História', 'Jornalismo', 'Letras', 'Marketing', 'Matemática', 'Música', 'Psicologia', 'Química', 'Sociologia', 'Teatro'];

const GRAD = {
  direito: { n: 'Faculdade de Direito', y: 3, cost: 40000, smr: 55 },
  medicina: { n: 'Faculdade de Medicina', y: 4, cost: 60000, smr: 70, maj: ['Biologia', 'Química', 'Física'] },
  odonto: { n: 'Odontologia', y: 4, cost: 50000, smr: 60, maj: ['Biologia', 'Química'] },
  farmacia: { n: 'Farmácia', y: 4, cost: 40000, smr: 60, maj: ['Química', 'Biologia'] },
  vet: { n: 'Veterinária', y: 4, cost: 45000, smr: 60, maj: ['Biologia'] },
  enfermagem: { n: 'Enfermagem', y: 2, cost: 25000, smr: 45 },
  mba: { n: 'Escola de Negócios (MBA)', y: 2, cost: 50000, smr: 55 },
  phd: { n: 'Doutorado', y: 5, cost: 0, smr: 72 }
};

// [id, título, salário base USD, requisitos, cargos]
// req: e = 'medio' | 'tec' | 'uni' ; m = cursos ; g = pós ; smr/loo/ath mínimos ; age
const JOBS = [
  ['faxina', 'Faxineiro|Faxineira', 20000, {}, ['Auxiliar de limpeza', 'Zelador|Zeladora', 'Supervisor de limpeza|Supervisora de limpeza']],
  ['garcom', 'Garçom|Garçonete', 21000, {}, ['Garçom|Garçonete', 'Maître', 'Gerente de restaurante']],
  ['caixa', 'Operador de caixa|Operadora de caixa', 22000, {}, ['Operador de caixa|Operadora de caixa', 'Supervisor de caixa|Supervisora de caixa', 'Gerente de loja']],
  ['fastfood', 'Atendente de lanchonete', 19000, {}, ['Atendente', 'Gerente de turno', 'Gerente da unidade']],
  ['app', 'Motorista de aplicativo', 28000, { age: 18, lic: 'carro' }, null],
  ['entregador', 'Entregador|Entregadora', 24000, {}, null],
  ['pedreiro', 'Pedreiro|Pedreira', 30000, {}, ['Ajudante de obras', 'Pedreiro|Pedreira', 'Mestre de obras']],
  ['seguranca', 'Segurança', 30000, { ath: 30 }, ['Vigilante', 'Segurança', 'Chefe de segurança']],
  ['gari', 'Gari', 32000, {}, null],
  ['pintor', 'Pintor|Pintora', 30000, {}, null],
  ['recep', 'Recepcionista', 26000, {}, null],
  ['cabelo', 'Cabeleireiro|Cabeleireira', 28000, {}, ['Assistente', 'Cabeleireiro|Cabeleireira', 'Dono de salão|Dona de salão']],
  ['barman', 'Bartender', 25000, { age: 18 }, null],
  ['agricultor', 'Agricultor|Agricultora', 26000, {}, null],
  ['pescador', 'Pescador|Pescadora', 27000, {}, null],
  ['vendedor', 'Vendedor|Vendedora', 30000, {}, ['Vendedor|Vendedora', 'Vendedor sênior|Vendedora sênior', 'Gerente de vendas']],
  ['tatuador', 'Tatuador|Tatuadora', 40000, {}, null],
  ['fotografo', 'Fotógrafo|Fotógrafa', 38000, {}, null],
  ['dj', 'DJ', 35000, {}, null],
  ['taxi', 'Taxista', 30000, { lic: 'carro' }, null],
  ['personal', 'Personal trainer', 40000, { e: 'medio', ath: 55 }, null],
  ['corretor', 'Corretor de imóveis|Corretora de imóveis', 55000, { e: 'medio' }, ['Corretor júnior|Corretora júnior', 'Corretor|Corretora', 'Corretor sênior|Corretora sênior']],
  ['carteiro', 'Carteiro|Carteira', 38000, { e: 'medio' }, null],
  ['caminhao', 'Caminhoneiro|Caminhoneira', 45000, { e: 'medio', lic: 'carro' }, null],
  ['bombeiro', 'Bombeiro|Bombeira', 50000, { e: 'medio', ath: 45 }, ['Bombeiro|Bombeira', 'Tenente', 'Capitão|Capitã', 'Comandante']],
  ['policial', 'Policial', 52000, { e: 'medio', ath: 40 }, ['Recruta', 'Policial', 'Detetive', 'Delegado|Delegada', 'Comissário|Comissária']],
  ['mecanico', 'Mecânico|Mecânica', 40000, { e: 'medio' }, null],
  ['carcereiro', 'Agente penitenciário|Agente penitenciária', 42000, { e: 'medio' }, null],
  ['comissario', 'Comissário de bordo|Comissária de bordo', 50000, { e: 'medio', loo: 45 }, null],
  ['eletricista', 'Eletricista', 48000, { e: 'tec' }, null],
  ['encanador', 'Encanador|Encanadora', 46000, { e: 'tec' }, null],
  ['tecenf', 'Técnico de enfermagem|Técnica de enfermagem', 38000, { e: 'tec' }, null],
  ['ti', 'Técnico de TI|Técnica de TI', 50000, { e: 'tec' }, ['Suporte', 'Analista de TI', 'Gerente de TI']],
  ['chef', 'Cozinheiro|Cozinheira', 45000, { e: 'tec' }, ['Cozinheiro|Cozinheira', 'Sous-chef', 'Chef executivo|Chef executiva']],
  ['piloto', 'Piloto de avião', 140000, { e: 'uni', lic: 'aviao' }, ['Copiloto|Copilota', 'Piloto|Pilota', 'Comandante']],
  ['professor', 'Professor|Professora', 45000, { e: 'uni', m: ['Educação', 'Letras', 'Matemática', 'História', 'Biologia', 'Física', 'Química', 'Educação Física'] }, ['Professor substituto|Professora substituta', 'Professor|Professora', 'Coordenador|Coordenadora', 'Diretor de escola|Diretora de escola']],
  ['jornalista', 'Jornalista', 48000, { e: 'uni', m: ['Jornalismo', 'Comunicação', 'Letras'] }, ['Repórter', 'Editor|Editora', 'Editor-chefe|Editora-chefe']],
  ['contador', 'Contador|Contadora', 65000, { e: 'uni', m: ['Contabilidade', 'Finanças', 'Economia'] }, ['Contador júnior|Contadora júnior', 'Contador|Contadora', 'Contador sênior|Contadora sênior', 'Controller']],
  ['analista', 'Analista financeiro|Analista financeira', 80000, { e: 'uni', m: ['Finanças', 'Economia', 'Matemática', 'Administração'] }, ['Analista', 'Associado|Associada', 'Vice-presidente', 'Diretor financeiro|Diretora financeira']],
  ['engenheiro', 'Engenheiro|Engenheira', 85000, { e: 'uni', m: ['Engenharia', 'Física'] }, ['Engenheiro júnior|Engenheira júnior', 'Engenheiro|Engenheira', 'Engenheiro sênior|Engenheira sênior', 'Engenheiro-chefe|Engenheira-chefe']],
  ['dev', 'Programador|Programadora', 95000, { e: 'uni', m: ['Ciência da Computação', 'Matemática', 'Engenharia'] }, ['Dev júnior', 'Dev pleno', 'Dev sênior', 'Arquiteto de software|Arquiteta de software', 'CTO']],
  ['hackerbr', 'Analista de cibersegurança', 105000, { e: 'uni', m: ['Ciência da Computação'], smr: 65 }, ['Analista', 'Pentester', 'Chefe de segurança digital']],
  ['arquiteto', 'Arquiteto|Arquiteta', 75000, { e: 'uni', m: ['Arquitetura'] }, null],
  ['designer', 'Designer gráfico|Designer gráfica', 50000, { e: 'uni', m: ['Design', 'Artes'] }, ['Designer júnior', 'Designer', 'Diretor de arte|Diretora de arte']],
  ['psicologo', 'Psicólogo|Psicóloga', 70000, { e: 'uni', m: ['Psicologia'] }, null],
  ['biologo', 'Biólogo|Bióloga', 60000, { e: 'uni', m: ['Biologia'] }, null],
  ['quimico', 'Químico|Química', 68000, { e: 'uni', m: ['Química'] }, null],
  ['economista', 'Economista', 85000, { e: 'uni', m: ['Economia', 'Finanças'] }, null],
  ['publicitario', 'Publicitário|Publicitária', 60000, { e: 'uni', m: ['Marketing', 'Comunicação', 'Design'] }, ['Redator|Redatora', 'Diretor de criação|Diretora de criação']],
  ['social', 'Assistente social', 45000, { e: 'uni', m: ['Sociologia', 'Psicologia'] }, null],
  ['bibliotecario', 'Bibliotecário|Bibliotecária', 45000, { e: 'uni' }, null],
  ['curador', 'Curador de museu|Curadora de museu', 50000, { e: 'uni', m: ['História', 'Artes'] }, null],
  ['detetive', 'Detetive particular', 50000, { e: 'uni', m: ['Criminologia', 'Psicologia'] }, null],
  ['agente', 'Agente federal', 75000, { e: 'uni', m: ['Criminologia', 'Ciência Política', 'Direito'], ath: 40 }, ['Agente', 'Agente especial', 'Diretor-adjunto|Diretora-adjunta']],
  ['diplomata', 'Diplomata', 90000, { e: 'uni', m: ['Ciência Política', 'História', 'Economia', 'Letras'], smr: 60 }, ['Terceiro-secretário|Terceira-secretária', 'Conselheiro|Conselheira', 'Embaixador|Embaixadora']],
  ['advogado', 'Advogado|Advogada', 110000, { g: 'direito' }, ['Associado|Associada', 'Advogado|Advogada', 'Sócio|Sócia', 'Sócio-sênior|Sócia-sênior']],
  ['promotor', 'Promotor|Promotora', 100000, { g: 'direito' }, null],
  ['juiz', 'Juiz|Juíza', 160000, { g: 'direito', age: 35, smr: 65 }, ['Juiz|Juíza', 'Desembargador|Desembargadora', 'Ministro do Supremo|Ministra do Supremo']],
  ['medico', 'Médico|Médica', 200000, { g: 'medicina' }, ['Residente', 'Médico|Médica', 'Médico chefe|Médica chefe', 'Diretor clínico|Diretora clínica']],
  ['cirurgiao', 'Cirurgião|Cirurgiã', 300000, { g: 'medicina', smr: 75 }, ['Residente cirúrgico|Residente cirúrgica', 'Cirurgião|Cirurgiã', 'Cirurgião-chefe|Cirurgiã-chefe']],
  ['dentista', 'Dentista', 160000, { g: 'odonto' }, null],
  ['farmaceutico', 'Farmacêutico|Farmacêutica', 120000, { g: 'farmacia' }, null],
  ['veterinario', 'Veterinário|Veterinária', 100000, { g: 'vet' }, null],
  ['enfermeiro', 'Enfermeiro|Enfermeira', 75000, { g: 'enfermagem' }, ['Enfermeiro|Enfermeira', 'Enfermeiro-chefe|Enfermeira-chefe']],
  ['executivo', 'Executivo|Executiva', 150000, { g: 'mba' }, ['Gerente', 'Diretor|Diretora', 'Vice-presidente', 'CEO']],
  ['consultor', 'Consultor|Consultora', 110000, { g: 'mba' }, ['Consultor|Consultora', 'Gerente de projetos', 'Sócio|Sócia']],
  ['cientista', 'Cientista pesquisador|Cientista pesquisadora', 90000, { g: 'phd' }, ['Pesquisador|Pesquisadora', 'Pesquisador sênior|Pesquisadora sênior', 'Diretor de laboratório|Diretora de laboratório']],
  ['universitario', 'Professor universitário|Professora universitária', 85000, { g: 'phd' }, ['Professor assistente|Professora assistente', 'Professor associado|Professora associada', 'Professor titular|Professora titular', 'Reitor|Reitora']],
  ['astronauta', 'Astronauta', 130000, { g: 'phd', ath: 60, smr: 80 }, ['Candidato a astronauta|Candidata a astronauta', 'Astronauta', 'Comandante de missão']],
  ['monge', 'Monge|Freira', 6000, { rel: true }, ['Noviço|Noviça', 'Monge|Freira', 'Abade|Abadessa']],
  ['padre', 'Sacerdote|Sacerdotisa', 35000, { e: 'medio', rel: true }, ['Sacerdote|Sacerdotisa', 'Líder religioso|Líder religiosa', 'Alto sacerdote|Alta sacerdotisa']]
];

const PARTTIME = [
  ['Atendente de lanchonete', 8000], ['Caixa de supermercado', 9000], ['Babá', 6000], ['Salva-vidas', 7500], ['Entregador de jornal|Entregadora de jornal', 5000],
  ['Repositor|Repositora', 8500], ['Lavador de carros|Lavadora de carros', 7000], ['Bilheteiro de cinema|Bilheteira de cinema', 7000], ['Cuidador de pets|Cuidadora de pets', 6500],
  ['Auxiliar de biblioteca', 6000], ['Monitor de acampamento|Monitora de acampamento', 6500], ['Professor particular|Professora particular', 9500], ['Recepcionista de academia', 8000], ['Garçom|Garçonete', 9000]
];

const GIGS = [
  { n: 'Cortar grama', p: [40, 120], age: 10, ic: '🌿' }, { n: 'Passear com cães', p: [30, 90], age: 9, ic: '🐕' },
  { n: 'Lavar carros', p: [30, 100], age: 10, ic: '🚗' }, { n: 'Cuidar de crianças', p: [50, 150], age: 12, ic: '🍼' },
  { n: 'Vender limonada', p: [5, 60], age: 6, ic: '🍋' }, { n: 'Entregar panfletos', p: [20, 70], age: 11, ic: '📄' },
  { n: 'Recolher latinhas', p: [5, 40], age: 8, ic: '🥫' }, { n: 'Dar aulas particulares', p: [60, 200], age: 13, smr: 70, ic: '📚' },
  { n: 'Fazer fretes', p: [80, 250], age: 18, ic: '📦' }, { n: 'Tocar na rua', p: [0, 150], age: 12, ic: '🎸' },
  { n: 'Montar móveis', p: [60, 180], age: 16, ic: '🔧' }, { n: 'Editar vídeos', p: [70, 300], age: 14, smr: 50, ic: '🎞️' }
];

// sev 1-4; cure = facilidade de cura
const DISEASES = [
  { n: 'Gripe', sev: 1, cure: .95 }, { n: 'Resfriado', sev: 1, cure: .98 }, { n: 'Enxaqueca', sev: 1, cure: .8 }, { n: 'Conjuntivite', sev: 1, cure: .95 },
  { n: 'Catapora', sev: 1, cure: .95, maxA: 14 }, { n: 'Sarampo', sev: 2, cure: .85, maxA: 14 }, { n: 'Piolhos', sev: 1, cure: .99, maxA: 14 }, { n: 'Infecção de ouvido', sev: 1, cure: .95, maxA: 12 },
  { n: 'Dor nas costas', sev: 1, cure: .7, minA: 25 }, { n: 'Insônia', sev: 1, cure: .7, minA: 15 }, { n: 'Asma', sev: 2, cure: .6 }, { n: 'Mononucleose', sev: 2, cure: .9, minA: 13 },
  { n: 'Pneumonia', sev: 3, cure: .85 }, { n: 'Hipertensão', sev: 2, cure: .7, minA: 35 }, { n: 'Diabetes', sev: 3, cure: .4, minA: 30 }, { n: 'Artrite', sev: 2, cure: .5, minA: 45 },
  { n: 'Gota', sev: 2, cure: .7, minA: 40 }, { n: 'Pedra nos rins', sev: 2, cure: .9, minA: 25 }, { n: 'Infecção urinária', sev: 1, cure: .95, minA: 15 }, { n: 'Hérnia', sev: 2, cure: .85, minA: 20 },
  { n: 'Câncer', sev: 4, cure: .35, minA: 30 }, { n: 'Leucemia', sev: 4, cure: .4 }, { n: 'Insuficiência cardíaca', sev: 4, cure: .3, minA: 55 }, { n: 'Alzheimer', sev: 3, cure: .05, minA: 65 },
  { n: 'Osteoporose', sev: 2, cure: .3, minA: 60 }, { n: 'Glaucoma', sev: 2, cure: .6, minA: 50 }, { n: 'Covid', sev: 2, cure: .9 }, { n: 'Hemorroidas', sev: 1, cure: .9, minA: 20 },
  { n: 'Depressão', sev: 2, cure: .5, mental: true, minA: 12 }, { n: 'Ansiedade', sev: 1, cure: .5, mental: true, minA: 10 },
  { n: 'Herpes', sev: 1, cure: .1, std: true }, { n: 'Clamídia', sev: 1, cure: .95, std: true }, { n: 'Gonorreia', sev: 1, cure: .9, std: true }, { n: 'Sífilis', sev: 2, cure: .9, std: true }
];

const TREATMENTS = [
  { n: 'Clínico geral', cost: 150, p: .65, free: true, ic: '🩺' },
  { n: 'Especialista no hospital', cost: 3000, p: .85, free: true, ic: '🏥' },
  { n: 'Tratamento experimental', cost: 40000, p: .95, ic: '🧪' },
  { n: 'Curandeiro', cost: 40, p: .3, risky: true, ic: '🌿' },
  { n: 'Medicina alternativa', cost: 300, p: .4, ic: '🧘' }
];

const SURGERIES = [
  { n: 'Rinoplastia', c: 6000, loo: 8 }, { n: 'Harmonização facial', c: 4000, loo: 6 }, { n: 'Lifting facial', c: 12000, loo: 10, minA: 35 },
  { n: 'Lipoaspiração', c: 7000, loo: 8 }, { n: 'Abdominoplastia', c: 9000, loo: 8 }, { n: 'Implante de silicone', c: 8000, loo: 7, g: 'F' },
  { n: 'Implante capilar', c: 9000, loo: 7 }, { n: 'Botox', c: 600, loo: 3, minA: 25 }, { n: 'Blefaroplastia', c: 5000, loo: 5, minA: 30 },
  { n: 'Lentes nos dentes', c: 10000, loo: 6 }, { n: 'Remoção de tatuagem', c: 1500, loo: 2 }
];

const CAR_BRANDS = ['Aurora', 'Brava', 'Cometa', 'Dínamo', 'Falcão', 'Lumen', 'Mistral', 'Orion', 'Pampa', 'Quasar', 'Rubi', 'Solaris', 'Tundra', 'Vortex', 'Zênite', 'Kestrel', 'Nimbus'];
const CAR_TYPES = [
  { t: 'Hatch compacto', p: [14000, 22000], ic: '🚗' }, { t: 'Sedã', p: [20000, 38000], ic: '🚗' }, { t: 'SUV', p: [30000, 65000], ic: '🚙' },
  { t: 'Picape', p: [28000, 60000], ic: '🛻' }, { t: 'Minivan', p: [26000, 45000], ic: '🚐' }, { t: 'Elétrico', p: [35000, 90000], ic: '🔋' },
  { t: 'Esportivo', p: [60000, 180000], ic: '🏎️' }, { t: 'Conversível', p: [45000, 130000], ic: '🚘' }, { t: 'Sedã de luxo', p: [80000, 200000], ic: '🚘' },
  { t: 'Supercarro', p: [250000, 2500000], ic: '🏎️' }, { t: 'Moto', p: [5000, 30000], ic: '🏍️' }, { t: 'Quadriciclo', p: [6000, 15000], ic: '🏍️' }
];
const HOUSE_TYPES = [
  { t: 'Quitinete', p: [60000, 140000], ic: '🏢' }, { t: 'Apartamento', p: [120000, 450000], ic: '🏢' }, { t: 'Casa térrea', p: [150000, 500000], ic: '🏠' },
  { t: 'Sobrado', p: [250000, 800000], ic: '🏡' }, { t: 'Cobertura', p: [700000, 4000000], ic: '🌆' }, { t: 'Chalé na montanha', p: [300000, 1200000], ic: '🛖' },
  { t: 'Casa de praia', p: [400000, 2500000], ic: '🏖️' }, { t: 'Fazenda', p: [600000, 3000000], ic: '🌾' }, { t: 'Mansão', p: [3000000, 30000000], ic: '🏰' },
  { t: 'Castelo', p: [15000000, 80000000], ic: '🏯' }, { t: 'Trailer', p: [15000, 45000], ic: '🚌' }
];
const BOATS = [
  { t: 'Caiaque', p: [800, 2500] }, { t: 'Bote inflável', p: [2000, 8000] }, { t: 'Jet ski', p: [9000, 20000] }, { t: 'Lancha', p: [40000, 250000] },
  { t: 'Veleiro', p: [60000, 500000] }, { t: 'Iate', p: [1000000, 15000000] }, { t: 'Superiate', p: [30000000, 300000000] }
];
const AIRCRAFT = [
  { t: 'Ultraleve', p: [40000, 120000] }, { t: 'Monomotor', p: [150000, 600000] }, { t: 'Bimotor', p: [700000, 3000000] },
  { t: 'Helicóptero', p: [500000, 8000000] }, { t: 'Jato executivo', p: [5000000, 70000000] }
];
const JEWELRY = [
  { t: 'Anel de noivado', p: [1500, 25000], ring: true }, { t: 'Aliança de ouro', p: [800, 4000], ring: true }, { t: 'Anel de diamante', p: [5000, 120000], ring: true },
  { t: 'Colar de pérolas', p: [1000, 15000] }, { t: 'Relógio de luxo', p: [5000, 300000] }, { t: 'Brincos de diamante', p: [2000, 60000] },
  { t: 'Pulseira de ouro', p: [900, 12000] }, { t: 'Tiara de safiras', p: [20000, 500000] }, { t: 'Broche de esmeralda', p: [3000, 90000] }
];
const INSTRUMENTS = ['Violão', 'Guitarra', 'Baixo', 'Bateria', 'Piano', 'Violino', 'Saxofone', 'Flauta', 'Trompete', 'Teclado', 'Violoncelo', 'Ukulele', 'Gaita'];
const HEIRLOOMS = ['Relógio de bolso antigo', 'Vaso de porcelana', 'Pintura a óleo', 'Anel de família', 'Violino antigo', 'Espada cerimonial', 'Moedas de ouro raras', 'Caixa de música', 'Diário centenário', 'Medalha de guerra', 'Broche de camafeu', 'Cálice de prata'];
const HEIR_COND = ['Impecável', 'Bom', 'Arranhado', 'Desgastado', 'Danificado'];

const PETS = [
  { t: 'Cachorro', ic: '🐕', p: [0, 1200], life: [10, 16], br: ['Vira-lata', 'Labrador', 'Poodle', 'Pastor-alemão', 'Golden', 'Bulldog', 'Chihuahua', 'Husky', 'Shih-tzu', 'Pinscher', 'Beagle'] },
  { t: 'Gato', ic: '🐈', p: [0, 900], life: [12, 20], br: ['Vira-lata', 'Siamês', 'Persa', 'Maine Coon', 'Sphynx', 'Angorá', 'Bengal'] },
  { t: 'Coelho', ic: '🐇', p: [30, 200], life: [7, 12] }, { t: 'Hamster', ic: '🐹', p: [10, 50], life: [2, 3] },
  { t: 'Peixe', ic: '🐟', p: [5, 80], life: [2, 8] }, { t: 'Tartaruga', ic: '🐢', p: [30, 300], life: [30, 80] },
  { t: 'Papagaio', ic: '🦜', p: [300, 3000], life: [30, 60] }, { t: 'Porquinho-da-índia', ic: '🐹', p: [20, 80], life: [5, 8] },
  { t: 'Cavalo', ic: '🐎', p: [2000, 40000], life: [25, 30] }, { t: 'Furão', ic: '🦦', p: [100, 400], life: [6, 9] }
];
const EXOTIC = [
  { t: 'Cobra', ic: '🐍', p: [200, 3000], life: [15, 25], d: .08 }, { t: 'Macaco', ic: '🐒', p: [3000, 15000], life: [20, 30], d: .05 },
  { t: 'Tigre', ic: '🐅', p: [20000, 80000], life: [15, 20], d: .2 }, { t: 'Leão', ic: '🦁', p: [25000, 90000], life: [12, 18], d: .2 },
  { t: 'Crocodilo', ic: '🐊', p: [5000, 30000], life: [40, 70], d: .18 }, { t: 'Lobo', ic: '🐺', p: [3000, 9000], life: [10, 14], d: .1 },
  { t: 'Coruja', ic: '🦉', p: [500, 4000], life: [10, 25], d: .01 }, { t: 'Aranha caranguejeira', ic: '🕷️', p: [50, 400], life: [10, 25], d: .02 },
  { t: 'Urso', ic: '🐻', p: [15000, 60000], life: [20, 30], d: .22 }, { t: 'Pinguim', ic: '🐧', p: [8000, 25000], life: [15, 20], d: .01 }
];
const PET_NAMES = 'Bolinha Thor Mel Luna Pipoca Fred Amora Nina Bob Max Pandora Toddy Pretinha Marley Chico Frida Zeus Biscoito Paçoca Tobias Cacau Belinha Nego Lola Simba Ozzy Fumaça Cookie Pingo Jujuba'.split(' ');

const VACATIONS = [
  { n: 'Praia no litoral', c: 800, ic: '🏖️' }, { n: 'Cruzeiro pelo Caribe', c: 3500, ic: '🛳️' }, { n: 'Paris', c: 4000, ic: '🗼' },
  { n: 'Tóquio', c: 4500, ic: '🗾' }, { n: 'Safári no Quênia', c: 6000, ic: '🦒' }, { n: 'Nova York', c: 3500, ic: '🗽' },
  { n: 'Pirâmides do Egito', c: 3000, ic: '🐫' }, { n: 'Machu Picchu', c: 2500, ic: '⛰️' }, { n: 'Maldivas', c: 9000, ic: '🏝️' },
  { n: 'Estação de esqui nos Alpes', c: 5500, ic: '🎿' }, { n: 'Roma e Veneza', c: 4200, ic: '🛶' }, { n: 'Islândia', c: 4800, ic: '🌋' },
  { n: 'Acampamento na floresta', c: 200, ic: '🏕️' }, { n: 'Parque de diversões', c: 600, ic: '🎢' }, { n: 'Bali', c: 3800, ic: '🌺' }
];

const CLUBS = ['Clube de Xadrez', 'Grupo de Teatro', 'Clube de Ciências', 'Clube de Debate', 'Banda da escola', 'Coral', 'Clube de Artes', 'Olimpíada de Matemática', 'Clube de Robótica', 'Jornal da escola', 'Grêmio estudantil', 'Clube de Leitura', 'Clube de Games', 'Clube de Investimentos'];
const SPORTS = ['Futebol', 'Basquete', 'Vôlei', 'Atletismo', 'Natação', 'Handebol', 'Ginástica', 'Tênis', 'Judô', 'Futebol americano', 'Beisebol', 'Hóquei'];
const CLIQUES = ['Nerds', 'Atletas', 'Populares', 'Góticos', 'Skatistas', 'Artistas', 'Gamers', 'Teatreiros', 'Rebeldes', 'Patricinhas e Mauricinhos'];
const BELTS = ['Branca', 'Amarela', 'Laranja', 'Verde', 'Azul', 'Roxa', 'Marrom', 'Preta'];

const CRIMES = [
  { id: 'furto', n: 'Furtar uma loja', age: 8, p: .7, yrs: [0, 1], ic: '🛍️' },
  { id: 'carteira', n: 'Bater carteira', age: 10, p: .65, yrs: [0, 2], ic: '👛' },
  { id: 'pacote', n: 'Roubar encomendas', age: 10, p: .75, yrs: [0, 1], ic: '📦' },
  { id: 'vandal', n: 'Vandalismo / pichação', age: 10, p: .75, yrs: [0, 1], ic: '🎨' },
  { id: 'casa', n: 'Assaltar uma casa', age: 14, p: 0, yrs: [2, 5], ic: '🏚️' },
  { id: 'carro', n: 'Roubar um carro', age: 14, p: .5, yrs: [2, 6], ic: '🚘' },
  { id: 'hack', n: 'Invasão hacker', age: 13, p: 0, yrs: [2, 10], ic: '💻' },
  { id: 'extorsao', n: 'Extorsão', age: 16, p: .45, yrs: [3, 8], ic: '💰' },
  { id: 'banco', n: 'Assaltar um banco', age: 18, p: .25, yrs: [8, 20], ic: '🏦' },
  { id: 'trem', n: 'Assaltar um trem de carga', age: 18, p: .3, yrs: [10, 25], ic: '🚂' },
  { id: 'agressao', n: 'Agredir alguém', age: 10, p: .6, yrs: [1, 5], ic: '👊' },
  { id: 'homicidio', n: 'Cometer um homicídio', age: 14, p: .45, yrs: [20, 60], ic: '🔪' }
];

const RIBBONS = [
  ['bilionario', 'Bilionário', '💎', 'Morreu com patrimônio acima de 1 bilhão'],
  ['rico', 'Endinheirado', '💰', 'Morreu com mais de 10 milhões'],
  ['celebridade', 'Celebridade', '🌟', 'Fama máxima'],
  ['monarca', 'Coroado', '👑', 'Governou um reino'],
  ['presidente', 'Chefe de Estado', '🏛️', 'Foi presidente'],
  ['chefao', 'Poderoso Chefão', '🎩', 'Comandou uma família do crime'],
  ['imortal', 'Eterno', '🧛', 'Viveu mais de 150 anos como vampiro'],
  ['mago', 'Arquimago', '🔮', 'Dominou a magia'],
  ['campeao', 'Campeão', '🏆', 'Campeão como atleta ou lutador'],
  ['assassino', 'Sanguinário', '🩸', 'Cometeu 3+ homicídios'],
  ['presidiario', 'Presidiário', '⛓️', 'Passou 15+ anos preso'],
  ['criminoso', 'Fora da Lei', '🦹', 'Cometeu 10+ crimes'],
  ['academico', 'Acadêmico', '🎓', 'Teve 3+ diplomas'],
  ['familia', 'Família Grande', '👨‍👩‍👧‍👦', 'Teve 5+ filhos'],
  ['romantico', 'Destruidor de Corações', '💘', 'Teve 10+ parceiros'],
  ['fiel', 'Alma Gêmea', '💞', 'Ficou casado 40+ anos com a mesma pessoa'],
  ['centenario', 'Centenário', '🎂', 'Viveu 100+ anos'],
  ['viajante', 'Viajante', '🧳', 'Fez 10+ viagens'],
  ['petlover', 'Amigo dos Bichos', '🐾', 'Teve 6+ pets'],
  ['generoso', 'Generoso', '🤲', 'Doou muito dinheiro'],
  ['workaholic', 'Viciado em Trabalho', '💼', 'Trabalhou 40+ anos'],
  ['viciado', 'Vida Desregrada', '🍾', 'Lutou contra vícios'],
  ['jovem', 'Partiu Cedo', '🕯️', 'Morreu antes dos 18'],
  ['solitario', 'Solitário', '🌑', 'Morreu sem amigos nem família próxima'],
  ['preguicoso', 'Folgado', '🛋️', 'Nunca trabalhou'],
  ['comum', 'Vida Comum', '🍃', 'Uma vida tranquila']
];

const ACHIEVEMENTS = [
  ['primeira', 'Primeiro sopro', 'Comece sua primeira vida'],
  ['formado', 'Formatura', 'Conclua o ensino médio'],
  ['diploma', 'Doutor de anel', 'Forme-se na universidade'],
  ['medico', 'Jaleco branco', 'Torne-se médico'],
  ['advogado', 'Doutor da lei', 'Torne-se advogado'],
  ['milionario', 'Primeiro milhão', 'Tenha 1 milhão em patrimônio'],
  ['bilionario', 'Bi', 'Tenha 1 bilhão em patrimônio'],
  ['casou', 'Sim, aceito', 'Case-se'],
  ['divorcio', 'Cada um pro seu lado', 'Divorcie-se'],
  ['pai', 'Herdeiro', 'Tenha um filho'],
  ['familia', 'Clã', 'Tenha 5 filhos na mesma vida'],
  ['preso', 'Sol nascer quadrado', 'Vá para a prisão'],
  ['fuga', 'Grande fuga', 'Fuja da prisão'],
  ['crime10', 'Ficha corrida', 'Cometa 10 crimes'],
  ['mafia', 'Família', 'Entre para o crime organizado'],
  ['chefao', 'Don', 'Torne-se chefe da máfia'],
  ['famoso', 'Paparazzi', 'Chegue a 80% de fama'],
  ['verificado', 'Selo azul', 'Seja verificado numa rede social'],
  ['milhao_seg', 'Influente', 'Tenha 1 milhão de seguidores'],
  ['ator', 'Luz, câmera...', 'Consiga um papel principal'],
  ['estatueta', 'Estatueta dourada', 'Ganhe o prêmio de melhor atuação'],
  ['platina', 'Disco de platina', 'Lance um álbum de platina'],
  ['presidente', 'Faixa presidencial', 'Seja eleito presidente'],
  ['atleta', 'Profissional', 'Torne-se atleta profissional'],
  ['campeao', 'Campeão', 'Ganhe um campeonato'],
  ['empresa', 'Empreendedor', 'Abra uma empresa'],
  ['ipo', 'Toque do sino', 'Abra o capital da sua empresa'],
  ['rei', 'Coroação', 'Assuma o trono'],
  ['vampiro', 'Sede eterna', 'Torne-se um vampiro'],
  ['bruxo', 'Faísca mágica', 'Desperte poderes mágicos'],
  ['arquimago', 'Arquimago', 'Alcance o nível máximo de magia'],
  ['centenario', 'Centenário', 'Viva até os 100 anos'],
  ['loteria', 'Bilhete premiado', 'Ganhe o prêmio máximo da loteria'],
  ['cassino', 'A casa perdeu', 'Ganhe 21 no blackjack'],
  ['viagem10', 'Passaporte carimbado', 'Faça 10 viagens numa vida'],
  ['faixapreta', 'Faixa preta', 'Conquiste a faixa preta'],
  ['emigrou', 'Nova pátria', 'Emigre para outro país'],
  ['geracao5', 'Dinastia', 'Chegue à 5ª geração'],
  ['exotico', 'Domador', 'Tenha um animal exótico'],
  ['livro', 'Best-seller', 'Escreva um livro best-seller'],
  ['cinema', 'Cineasta', 'Dirija um filme de sucesso'],
  ['lutador', 'Cinturão', 'Conquiste um cinturão de luta'],
  ['jatinho', 'Céu de brigadeiro', 'Tenha um jato executivo'],
  ['iate', 'Lobo do mar', 'Tenha um iate'],
  ['reliquias', 'Caçador de relíquias', 'Encontre todas as relíquias da caça ao tesouro'],
  ['desafio', 'Desafiante', 'Complete um desafio'],
  ['militar', 'Às suas ordens', 'Chegue a general'],
  ['astronauta', 'Além da órbita', 'Vá ao espaço']
];

const SOCIAL_APPS = [
  { id: 'fotolar', n: 'Fotolar', ic: '📸', d: 'Fotos e stories' },
  { id: 'vibe', n: 'Vibe', ic: '🎵', d: 'Vídeos curtos' },
  { id: 'piado', n: 'Piado', ic: '🐦', d: 'Textos curtos' },
  { id: 'streamup', n: 'StreamUp', ic: '▶️', d: 'Vídeos longos e lives' }
];
const POST_TYPES = [
  { n: 'Selfie', st: 'loo' }, { n: 'Meme', st: 'smr' }, { n: 'Foto de comida', st: null }, { n: 'Opinião polêmica', st: null, risk: .25 },
  { n: 'Vídeo engraçado', st: 'smr' }, { n: 'Tutorial', st: 'smr' }, { n: 'Foto com o pet', st: null, pet: true }, { n: 'Dancinha', st: 'loo' },
  { n: 'Desabafo', st: null }, { n: 'Publi (propaganda)', st: null, ad: true }, { n: 'Foto de viagem', st: 'loo' }, { n: 'Live', st: 'smr' }
];

const MAFIA_FAMS = [
  { n: 'Família Moretti', not: 80 }, { n: 'Clã Volkov', not: 70 }, { n: 'Cartel do Pacífico', not: 90 }, { n: 'Irmandade do Porto', not: 40 }, { n: 'Sindicato Dragão', not: 60 }, { n: 'Família Castellano', not: 55 }
];
const MAFIA_RANKS = ['Associado|Associada', 'Soldado|Soldada', 'Capo', 'Subchefe|Subchefe', 'Chefão|Chefona'];

const POL_OFFICES = [
  { n: 'Vereador|Vereadora', age: 18, cost: 5000, term: 4 },
  { n: 'Prefeito|Prefeita', age: 21, cost: 40000, term: 4 },
  { n: 'Deputado|Deputada', age: 21, cost: 120000, term: 4 },
  { n: 'Governador|Governadora', age: 30, cost: 600000, term: 4 },
  { n: 'Senador|Senadora', age: 35, cost: 900000, term: 6 },
  { n: 'Presidente', age: 35, cost: 5000000, term: 4 }
];
const POLICIES = ['Reduzir impostos', 'Aumentar salário mínimo', 'Investir em saúde', 'Investir em educação', 'Legalizar jogos de azar', 'Construir rodovias', 'Endurecer leis criminais', 'Proteger o meio ambiente', 'Cortar gastos públicos', 'Criar renda básica', 'Aumentar orçamento militar', 'Reforma da previdência'];
const PARTIES = ['Partido Progressista', 'Partido Conservador', 'Partido Verde', 'Partido Liberal', 'Partido Trabalhista', 'Independente'];

const PRO_SPORTS = [
  { n: 'Futebol', pos: ['Goleiro', 'Zagueiro', 'Lateral', 'Volante', 'Meia', 'Atacante'], teams: ['Tubarões FC', 'Leões da Serra', 'Atlético Aurora', 'União Porto', 'Real Cometa', 'Estrela do Sul', 'Sport Vulcano'] },
  { n: 'Basquete', pos: ['Armador', 'Ala-armador', 'Ala', 'Ala-pivô', 'Pivô'], teams: ['Falcões', 'Trovões', 'Gigantes', 'Panteras', 'Raios', 'Titãs'] },
  { n: 'Vôlei', pos: ['Levantador', 'Ponteiro', 'Oposto', 'Central', 'Líbero'], teams: ['Cometas', 'Tempestade', 'Brisa VC', 'Muralha', 'Ventania'] },
  { n: 'Futebol americano', pos: ['Quarterback', 'Running back', 'Wide receiver', 'Linebacker', 'Kicker'], teams: ['Bisões', 'Cavaleiros', 'Corsários', 'Lobos', 'Mustangs'] },
  { n: 'Beisebol', pos: ['Arremessador', 'Receptor', 'Interbases', 'Campista'], teams: ['Piratas', 'Coiotes', 'Martelos', 'Cardeais'] },
  { n: 'Hóquei', pos: ['Goleiro', 'Defensor', 'Ala', 'Centro'], teams: ['Glaciais', 'Ursos Polares', 'Lâminas', 'Nevasca'] }
];

const MUSIC_GENRES = ['Pop', 'Rock', 'Sertanejo', 'Funk', 'Hip-hop', 'MPB', 'Eletrônica', 'Jazz', 'Reggae', 'Pagode', 'K-pop', 'Country', 'Metal', 'Samba', 'Clássica', 'R&B', 'Forró', 'Indie'];
const FILM_GENRES = ['Ação', 'Comédia', 'Drama', 'Terror', 'Ficção científica', 'Romance', 'Animação', 'Suspense', 'Musical', 'Documentário', 'Fantasia'];
const FIGHT_MOVES = [
  { n: 'Jab', pw: 2, st: 1 }, { n: 'Cruzado', pw: 4, st: 2 }, { n: 'Gancho', pw: 5, st: 3 }, { n: 'Chute baixo', pw: 3, st: 2 }, { n: 'Chute alto', pw: 7, st: 4 },
  { n: 'Joelhada', pw: 6, st: 3 }, { n: 'Cotovelada', pw: 6, st: 3 }, { n: 'Queda de quadril', pw: 5, st: 4 }, { n: 'Mata-leão', pw: 9, st: 5 }, { n: 'Chave de braço', pw: 8, st: 5 },
  { n: 'Triângulo', pw: 9, st: 6 }, { n: 'Superman punch', pw: 7, st: 4 }, { n: 'Chute rodado', pw: 10, st: 6 }, { n: 'Guilhotina', pw: 8, st: 5 }, { n: 'Esquiva e contra', pw: 6, st: 2 }
];

// Magia
const WITCH_TYPES = [
  { n: 'Bruxa(o) da Natureza', d: 'Ervas e animais', b: 'hea' }, { n: 'Bruxa(o) Lunar', d: 'Intuição e sonhos', b: 'smr' },
  { n: 'Bruxa(o) Encantador(a)', d: 'Charme e ilusões', b: 'loo' }, { n: 'Bruxa(o) das Sombras', d: 'Maldições e segredos', b: 'craz' }
];
const MAGIC_RANKS = [['Comum', 0], ['Iniciado', 10], ['Aprendiz', 25], ['Adepto', 50], ['Feiticeiro', 90], ['Arquimago', 150]];
const SPELLS = [
  { id: 'luz', n: 'Faísca de luz', lv: 0, t: 'self', d: 'Um truque bonito. Felicidade +' },
  { id: 'cura', n: 'Cura menor', lv: 1, t: 'self', d: 'Recupera saúde' },
  { id: 'charme', n: 'Encanto do coração', lv: 1, t: 'npc', d: 'Aumenta a relação com alguém' },
  { id: 'brilho', n: 'Brilho radiante', lv: 2, t: 'self', d: 'Aparência +' },
  { id: 'sabedoria', n: 'Mente cristalina', lv: 2, t: 'self', d: 'Inteligência +' },
  { id: 'azar', n: 'Praga do azar', lv: 2, t: 'npc', d: 'Maldição: a pessoa adoece' , evil: true },
  { id: 'ouro', n: 'Ouro de fada', lv: 3, t: 'self', d: 'Conjura dinheiro (karma -)', evil: true },
  { id: 'cura_outro', n: 'Bênção curativa', lv: 3, t: 'npc', d: 'Cura outra pessoa' },
  { id: 'invis', n: 'Véu invisível', lv: 3, t: 'self', d: 'Próximo crime quase garantido' },
  { id: 'esquecer', n: 'Névoa do esquecimento', lv: 4, t: 'npc', d: 'Faz alguém esquecer uma briga' },
  { id: 'sapo', n: 'Transformar em sapo', lv: 4, t: 'npc', d: 'Humilha alguém por um tempo', evil: true },
  { id: 'juventude', n: 'Elixir da juventude', lv: 5, t: 'self', d: 'Rejuvenesce (idade -1)' },
  { id: 'tempestade', n: 'Tempestade arcana', lv: 5, t: 'self', d: 'Um espetáculo devastador', evil: true }
];
const INGREDIENTS = ['Pétala de lua', 'Raiz de mandrágora', 'Pena de corvo', 'Orvalho matinal', 'Cogumelo azul', 'Escama de sereia', 'Pó de estrela', 'Musgo antigo'];
const POTIONS = [
  { n: 'Poção da vitalidade', need: 2, fx: 'hea' }, { n: 'Poção da beleza', need: 2, fx: 'loo' }, { n: 'Poção do gênio', need: 3, fx: 'smr' },
  { n: 'Poção da alegria', need: 2, fx: 'hap' }, { n: 'Poção da sorte', need: 4, fx: 'luck' }, { n: 'Poção do amor', need: 3, fx: 'love' }
];
const FAMILIARS = ['Gato preto', 'Corvo', 'Sapo', 'Coruja', 'Raposa', 'Serpente', 'Morcego'];

const VAMP_RANKS = ['Recém-transformado', 'Noturno', 'Predador', 'Ancião', 'Senhor da Noite'];
const VAMP_POWERS = ['Velocidade sobrenatural', 'Hipnose', 'Visão noturna', 'Forma de névoa', 'Força bruta', 'Controle de morcegos'];

// Caça ao tesouro: relíquias escondidas em ações
const HUNT = [
  { id: 'pena', n: 'Pena dourada', hint: 'Dizem que voa por onde se lançam anzóis.', act: 'pescar' },
  { id: 'chave', n: 'Chave de bronze', hint: 'Escondida entre páginas silenciosas.', act: 'biblioteca' },
  { id: 'moeda', n: 'Moeda da sorte', hint: 'Gira junto com as fichas.', act: 'cassino' },
  { id: 'bussola', n: 'Bússola antiga', hint: 'Quem viaja longe pode tropeçar nela.', act: 'ferias' },
  { id: 'lanterna', n: 'Lanterna de vidro', hint: 'Brilha perto de fogueiras na mata.', act: 'acampar' },
  { id: 'medalhao', n: 'Medalhão do rei', hint: 'Enterrado no quintal de uma casa recém-comprada.', act: 'comprarCasa' }
];

const CHALLENGES = [
  { id: 'sonho', n: 'Sonho no exterior', ic: '✈️', steps: [
    ['Nasça fora dos EUA', s => s.flags.bornCountry !== 'us'], ['Emigre para os EUA', s => s.p.country === 'us' && s.flags.emigrated],
    ['Fique milionário', s => netWorth() >= 1e6 * 1], ['Tenha 3 filhos', s => alive('filho').length + byRole('filho').filter(n => !n.alive).length >= 3], ['Viva até os 80', s => s.p.age >= 80]] },
  { id: 'genio', n: 'Mente brilhante', ic: '🧠', steps: [
    ['Tenha 100% de inteligência', s => s.p.smr >= 100], ['Conclua um doutorado', s => hasDeg('phd')], ['Seja professor universitário', s => s.p.job?.id === 'universitario'], ['Escreva um best-seller', s => (s.cnt.bestseller || 0) >= 1]] },
  { id: 'crime', n: 'Rei do submundo', ic: '🦹', steps: [
    ['Cometa 10 crimes', s => (s.cnt.crimes || 0) >= 10], ['Fuja da prisão', s => (s.cnt.fugas || 0) >= 1], ['Entre para uma família criminosa', s => !!s.p.sp.mafia || (s.cnt.mafia || 0) > 0], ['Vire o chefão', s => (s.cnt.chefao || 0) >= 1]] },
  { id: 'rock', n: 'Estrela do rock', ic: '🎸', steps: [
    ['Aprenda um instrumento', s => Object.keys(s.p.instr || {}).length > 0], ['Comece carreira musical', s => !!s.p.sp.music], ['Lance um álbum de platina', s => (s.cnt.platina || 0) >= 1], ['Faça uma turnê mundial', s => (s.cnt.turneMundial || 0) >= 1]] },
  { id: 'selva', n: 'Lei da selva', ic: '🐅', steps: [
    ['Tenha 3 animais exóticos', s => (s.cnt.exoticos || 0) >= 3], ['Vá acampar', s => (s.cnt.acampar || 0) >= 1], ['Pesque 5 peixes', s => (s.cnt.peixes || 0) >= 5], ['Faça um safári', s => (s.cnt.safari || 0) >= 1]] },
  { id: 'casanova', n: 'Coração vagabundo', ic: '💘', steps: [
    ['Namore 8 pessoas', s => (s.cnt.parceiros || 0) >= 8], ['Case-se 3 vezes', s => (s.cnt.casamentos || 0) >= 3], ['Seja pego traindo', s => (s.cnt.pegoTraindo || 0) >= 1], ['Tenha 4 filhos', s => byRole('filho').length >= 4]] },
  { id: 'poder', n: 'Rumo ao poder', ic: '🏛️', steps: [
    ['Eleja-se vereador', s => (s.cnt.eleito0 || 0) >= 1], ['Eleja-se prefeito', s => (s.cnt.eleito1 || 0) >= 1], ['Eleja-se governador', s => (s.cnt.eleito3 || 0) >= 1], ['Eleja-se presidente', s => (s.cnt.eleito5 || 0) >= 1]] },
  { id: 'magnata', n: 'Magnata', ic: '🏢', steps: [
    ['Abra uma empresa', s => (s.cnt.empresas || 0) >= 1], ['Tenha 100 funcionários', s => (s.p.sp.biz || []).some(b => b.emp >= 100)], ['Empresa avaliada em 100 mi', s => (s.p.sp.biz || []).some(b => b.val >= 1e8)], ['Abra o capital (IPO)', s => (s.cnt.ipo || 0) >= 1]] },
  { id: 'luxo', n: 'Vida de luxo', ic: '🛥️', steps: [
    ['Tenha uma mansão', s => s.p.assets.some(a => a.t === 'Mansão' || a.t === 'Castelo')], ['Tenha um iate', s => s.p.assets.some(a => /iate/i.test(a.t))], ['Tenha um jato', s => s.p.assets.some(a => a.t === 'Jato executivo')], ['Tenha 5 joias', s => s.p.assets.filter(a => a.k === 'joia').length >= 5]] },
  { id: 'atleta', n: 'Lenda do esporte', ic: '🏅', steps: [
    ['Entre num time da escola', s => (s.cnt.timeEscola || 0) >= 1], ['Vire profissional', s => !!s.p.sp.athlete || (s.cnt.pro || 0) > 0], ['Seja campeão', s => (s.cnt.titulos || 0) >= 1], ['Seja campeão 3 vezes', s => (s.cnt.titulos || 0) >= 3]] },
  { id: 'eterno', n: 'Noite eterna', ic: '🧛', steps: [
    ['Torne-se vampiro', s => !!s.p.vamp], ['Transforme alguém em vampiro', s => (s.cnt.transformou || 0) >= 1], ['Chegue a Senhor da Noite', s => s.p.vamp?.rank >= 4], ['Viva até os 200', s => s.p.age >= 200]] },
  { id: 'feitico', n: 'Caldeirão borbulhante', ic: '🔮', steps: [
    ['Desperte a magia', s => !!s.p.magic], ['Prepare 5 poções', s => (s.cnt.pocoes || 0) >= 5], ['Lance 20 feitiços', s => (s.cnt.feiticos || 0) >= 20], ['Torne-se Arquimago', s => s.p.magic && s.p.magic.xp >= 150]] },
  { id: 'telona', n: 'Hollywood dos sonhos', ic: '🎬', steps: [
    ['Seja ator ou atriz', s => !!s.p.sp.actor], ['Faça um papel principal', s => (s.cnt.protagonista || 0) >= 1], ['Ganhe a estatueta', s => (s.cnt.estatueta || 0) >= 1], ['Dirija um filme', s => (s.cnt.filmes || 0) >= 1]] },
  { id: 'lutador', n: 'Punhos de aço', ic: '🥊', steps: [
    ['Faixa preta em artes marciais', s => s.p.belt >= 7], ['Vire lutador profissional', s => !!s.p.sp.fighter], ['Vença 10 lutas', s => (s.cnt.vitoriasLuta || 0) >= 10], ['Conquiste o cinturão', s => (s.cnt.cinturao || 0) >= 1]] }
];

const SCENARIOS = [
  { n: 'Herdeiro de ouro', d: 'Nasça numa família milionária', o: { cls: 'milionaria' } },
  { n: 'Do zero', d: 'Família pobre e muitos irmãos', o: { cls: 'pobre', sibs: 4 } },
  { n: 'Sangue azul', d: 'Nasça na realeza', o: { royal: true } },
  { n: 'Gênio precoce', d: 'Inteligência 100 e talento Intelecto', o: { smr: 100, talent: 'intelecto' } },
  { n: 'Atleta nato', d: 'Atletismo altíssimo', o: { ath: 95, talent: 'esporte' } },
  { n: 'Criança-prodígio da música', d: 'Talento musical', o: { talent: 'musica' } },
  { n: 'Filho da magia', d: 'Nasça com poderes mágicos', o: { witch: true } },
  { n: 'Órfão', d: 'Comece sem pais', o: { orphan: true, cls: 'pobre' } },
  { n: 'Beleza rara', d: 'Aparência 100', o: { loo: 100, talent: 'beleza' } },
  { n: 'Sobrevivente', d: 'Saúde frágil desde o nascimento', o: { hea: 25 } }
];
