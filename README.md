# Gear Generator

Gerador estático de perfis de engrenagens externas em DXF, integrado ao Factory Toolbox.

- Pasta canônica: `Z:\Projetos\Gear Generator`, no compartilhamento da rede. Não trabalhar em cópias paralelas.
- Site: https://guizlass-afk.github.io/GearGenerator/
- Portal: https://guizlass-afk.github.io/FactoryToolbox/
- Código original: todos os direitos reservados; veja LICENSE.

## O que esta versão entrega

Engrenagens retas ou helicoidais, com seleção de dentes, módulo normal, espessura, furo, ângulo e sentido de hélice. A referência selecionável é a cremalheira ISO 53:1998, tipos A, B, C ou D. Não há presets DIN/AGMA não verificados.

O SVG cotado da tela usa os mesmos pontos do contorno exportado. O desenho frontal preserva proporções; a pequena vista lateral é explicitamente esquemática. Download de DXF de corte, DXF com referências, SVG cotado e instruções CAD em TXT. Doze idiomas, RTL em árabe, temas claro/escuro e preferências locais compatíveis com o portal. Nada é enviado a um servidor.

O STEP não é disponibilizado: existe suporte STEP em kernels como Open CASCADE, mas esta versão não incorpora nem valida um kernel 3D ou um sólido torcido. DXF de engrenagem helicoidal é a seção transversal perpendicular ao eixo, não uma chapa que, apenas extrudada sem torção, se torne helicoidal.

## Geometria e limites

Valores da cremalheira normal (pressão normal fixa em 20°, deslocamento x=0):

| Referência ISO 53:1998 | ha* | hf* | raio da ponta da ferramenta / mn |
| --- | --- | --- | --- |
| A | 1.00 | 1.25 | 0.38 |
| B | 1.00 | 1.25 | 0.30 |
| C | 1.00 | 1.25 | 0.25 |
| D | 1.00 | 1.40 | 0.39 |

Os coeficientes referem-se à cremalheira. O raio de arredondamento NÃO é aplicado como um arco arbitrário no pé do dente: a raiz é a envoltória do movimento da ponta arredondada da cremalheira. No plano transversal de uma helicoidal, essa ponta é uma elipse devido à transformação de coordenadas.

Equações (internamente radianos e mm):

- `mt = mn / cos(beta)`
- `alpha_t = atan(tan(alpha_n) / cos(beta))`
- `rp = mt*z/2`, `rb = rp*cos(alpha_t)`
- `ra = rp + ha*mn`, `rf = rp - hf*mn`
- `inv(alpha) = tan(alpha) - alpha`
- Meio ângulo do dente em raio r: `pi/(2*z) + inv(alpha_t) - inv(acos(rb/r))`.
- Avanço por volta: `lead = 2*pi*rp/tan(beta)`; para dente reto não há lead finito.
- Torção total: `theta = ± b*tan(beta)/rp`. Direita positiva, esquerda negativa; vista desde +Z para a origem, rotação anti-horária positiva de Z=0 a Z=b.

### Derivação da raiz

Na seção normal, a ponta direita da ferramenta tem centro:

`vc = -hf*mn + rho`, `uc = pi*mn/4 + vc*tan(alpha_n) - rho/cos(alpha_n)`.

O arco é `u_n = uc + rho*cos(t)`, `v = vc + rho*sin(t)`, com `-pi/2 <= t <= -alpha_n`. Para a seção transversal, `u = u_n/cos(beta)`.

Para uma cremalheira rolando sem escorregamento, o ponto no sistema do disco é `R(phi)*(u + rp*phi, rp + v)`. Sua velocidade normal nula fornece:

`X = v*cos(beta)*cot(t)`, `phi = (X-u)/rp`.

O ponto exportado é `R(phi - (pi/2-pi/z))*(X,rp+v)`. Isso encontra analiticamente o flanco evolvente no fim do arco da ferramenta. O lado oposto é espelhado; arcos de topo e de raiz fecham cada passo angular. Todos os dentes são cópias por rotação, sem ponto duplicado de fechamento.

O gerador bloqueia undercut em vez de desenhar um pé de dente fictício. Com `vj=vc-rho*sin(alpha_n)`, exige `vj >= -rp*sin(alpha_t)^2`. O número mínimo indicado pela UI vem dessa condição da ferramenta usada, não de um limite universal para qualquer processo. Engrenagens abaixo do mínimo exigiriam um modelo com undercut ou deslocamento de perfil, não implementados.

Limites de software, não limites normativos: mn de 0,1 a 50 mm; z inteiro de 6 a 400 e acima do mínimo calculado; 0 < beta <= 45° nas helicoidais; b > 0 até 1.000 mm; 0 <= furo < df. Alvo de discretização de 0,001 a 0,1 mm e máximo de 200.000 vértices. Espessura e sentido não alteram a seção frontal; alteram as instruções 3D.

A polilinha aproxima as curvas por subdivisão adaptativa: verifica meio e quartos do intervalo com margem de 50% do alvo. A suite confere a distância contra amostras analíticas independentes. A UI apresenta um alvo geométrico, não uma classe de precisão de fabricação.

O perfil não inclui backlash, correção de perfil, alívio, protuberância de ferramenta, tolerância de furo, compensação de corte, cubo, chaveta, análise de resistência, ruído, contato ou validação do par. ISO 53 é uma referência de cremalheira; não certifica o produto final. A edição implementada é explicitamente 1998.

## DXF e CAD

DXF ASCII AC1015 (AutoCAD 2000), coordenadas em mm, `$INSUNITS=4` e `$MEASUREMENT=1`.

- `PROFILE`: uma LWPOLYLINE fechada, orientação anti-horária, em XY e Z=0.
- `BORE`: um CIRCLE exato, se o furo for maior que zero.
- Somente no download com referências: `REFERENCE` com círculos primitivo/base/raiz e `NOTES` com parâmetros. Não usar essas camadas para cortar ou extrudar.

As instruções especificam extrusão reta ou torção uniforme em torno da origem. Uma varredura helicoidal deve manter a seção paralela ao plano XY. Um loft simples entre duas seções não representa a mesma geometria. Ajustar a orientação do perfil do CAD para não introduzir inclinação adicional da seção.

Validação realizada com leitor independente ezdxf e geometria Shapely, não com todos os importadores CAD existentes. Ao importar, conferir unidades e os diâmetros informados.

## Execução e testes

Sem build ou dependências de produção. Servir a pasta com `python -m http.server 8091` e abrir http://127.0.0.1:8091/.

Para os testes, instalar `python -m pip install -r tests/requirements.txt` e ter Google Chrome instalado (ou adaptar o canal do Playwright). Executar `python tests/test_app.py`. Opcionalmente, `GEAR_TEST_DEPS` aponta para uma pasta isolada de dependências instalada com `pip --target`.

A suite verifica 60 combinações de cremalheira/hélice/dentes e extremos de escala, ausência de auto-interseções, limites radiais e periodicidade, desvio contra envoltória e evolvente independentes, ponto a ponto do DXF realmente baixado, unidades, camadas, auditoria sem reparos, parâmetros inválidos, downloads, persistência, temas e 12 idiomas em 4 larguras de tela. Capturas e downloads são salvos em `%TEMP%/gear-test-output`.

Traduções são editadas em `translations-source.json`; gerar `i18n.js` como `window.GearTranslations=` seguido do JSON e `;`. Manter chaves e placeholders iguais nos 12 idiomas.

## Fontes verificadas em 01/10/2026

- ISO, escopo e edição da referência: https://www.iso.org/standard/22643.html
- Drivetrain Hub, autores da referência técnica de cremalheiras e coeficientes A–D: https://www.drivetrainhub.com/notebooks/gears/tooling/Chapter%201%20-%20Basic%20Rack.html
- Drivetrain Hub, geometria helicoidal e conversão normal/transversal: https://www.drivetrainhub.com/notebooks/gears/geometry/Chapter%203%20-%20Helical%20Gears.html
- KHK, sistemas normal/transversal e sentidos de hélice em pares: https://khkgears.net/pdf/helical-tech.pdf
- Autodesk, LWPOLYLINE: https://help.autodesk.com/cloudhelp/2018/ENU/AutoCAD-DXF/files/GUID-748FC305-F3F2-4F74-825A-61F04D757A50.htm
- Autodesk, unidades no HEADER: https://help.autodesk.com/cloudhelp/2021/ENU/AutoCAD-DXF/files/GUID-A85E8E67-27CD-4C59-BE61-4DC9FADBE74A.htm
- Open CASCADE, disponibilidade de tradutor STEP (não integrado): https://occt3d.com/dev/doc/overview/html/occt_user_guides__step.html

Implementação matemática e desenho próprios. Não redistribui textos integrais de normas, tabelas protegidas extensas, bibliotecas CAD ou desenhos de terceiros.
