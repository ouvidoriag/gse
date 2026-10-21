# 🗺️ Relatório de Cruzamento e Comparação: Google Maps vs. Banco SIGEM V2

> **Base de Origem:** `sigem_enderecos_coordenadas_verificadas.xlsx` convertida para JSON  
> **Total de Equipamentos Auditados:** 449  
> **Total com Coordenadas Extraídas do Google Maps:** 415 (92.4%)

---

## 📊 1. Distribuição das Diferenças de Distância

| Faixa de Distância | Quantidade | Percentual | Significado Cartográfico |
| :--- | :---: | :---: | :--- |
| 🟢 **Exato / Mesmo Imóvel (≤ 100m)** | **37** | 8.2% | Mesma entrada/prédio ou quarteirão imediato |
| 🟡 **Proximidade (101m a 500m)** | **63** | 14.0% | Variação de numeração ou extensão da mesma via |
| 🟠 **Desvio Moderado (501m a 2000m)** | **166** | 37.0% | Deslocamento entre pontas de vias extensas ou bairros adjacentes |
| 🔴 **Divergência Alta / Crítico (> 2000m)** | **149** | 33.2% | **Erros reais no cadastro legado (homônimos / geocodificação errada)** |
| ⚪ **Não Localizados pelo Google** | **34** | 7.6% | Vias rurais / sem denominação oficial |

---

## 🚨 2. Principais Equipamentos com Divergência Crítica (> 2 km)

Estes são os equipamentos que, assim como a **UBS Nair Borges Fernandes** e a **E.M. Imaculada Conceição**, apresentaram divergência real e necessitam de retificação de coordenadas:

| ID | Equipamento / Unidade | Bairro | Dist. | Coordenada Google | Coordenada Banco SIGEM | Distância | Diagnóstico |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| `rec_127` | **FUNDEC Posto Avançado Igreja Metodi** | 25 de Agosto | 1 | `(-22.58737, -43.30605)` | `(-22.79070, -43.30432)` | ⚠️ **22.61 km** | Divergência de rua/polo |
| `rec_383` | **Secretaria Municipal de Segurança P** | 25 de Agosto | 1 | `(-22.59858, -43.29263)` | `(-22.78870, -43.30659)` | ⚠️ **21.19 km** | Divergência de rua/polo |
| `rec_esc_75` | **E E M Sergipe** | Xerém | 4 | `(-22.76672, -43.29764)` | `(-22.57654, -43.30662)` | ⚠️ **21.17 km** | Divergência de rua/polo |
| `rec_149` | **FUNDEC — Instituto John Huss** | Xerém | 4 | `(-22.75152, -43.30304)` | `(-22.57964, -43.30533)` | ⚠️ **19.11 km** | Divergência de rua/polo |
| `rec_esc_132` | **E M Marcílio Dias** | Parque Independência | 2 | `(-22.78657, -43.30678)` | `(-22.68026, -43.24976)` | ⚠️ **13.19 km** | Divergência de rua/polo |
| `rec_433` | **Equinovida — Centro Municipal de Eq** | Jardim Primavera | 2 | `(-22.56791, -43.28452)` | `(-22.68119, -43.28669)` | ⚠️ **12.60 km** | Divergência de rua/polo |
| `rec_esc_93` | **E M Campos Elíseos** | Campos Elíseos | 2 | `(-22.59824, -43.29272)` | `(-22.70475, -43.27418)` | ⚠️ **11.99 km** | Divergência de rua/polo |
| `rec_382` | **Sede Histórica / 25 de Agosto** | Jardim Primavera | 1 | `(-22.68387, -43.28444)` | `(-22.78951, -43.30602)` | ⚠️ **11.95 km** | Divergência de rua/polo |
| `rec_esc_33` | **Creche e Escola Municipal Bairro Ta** | Tabuleiro | 4 | `(-22.68621, -43.28429)` | `(-22.58155, -43.31054)` | ⚠️ **11.95 km** | Divergência de rua/polo |
| `rec_20` | **SECRETARIA MUNICIPAL DE SAÚDE (SMS)** | Jardim Primavera | 2 | `(-22.68621, -43.28429)` | `(-22.79162, -43.30368)` | ⚠️ **11.89 km** | Divergência de rua/polo |
| `rec_esc_189` | **E M Sargento João Délio dos Santos** | Fazenda Piranema | 4 | `(-22.64950, -43.39243)` | `(-22.60233, -43.28915)` | ⚠️ **11.83 km** | Divergência de rua/polo |
| `rec_96` | **UBS Rural** | Xerém | 4 | `(-22.60373, -43.41028)` | `(-22.57628, -43.30470)` | ⚠️ **11.26 km** | Divergência de rua/polo |
| `rec_390` | **Subprefeitura do 4º Distrito (Xerém** | Xerém | 4 | `(-22.67471, -43.36027)` | `(-22.58450, -43.31050)` | ⚠️ **11.26 km** | Divergência de rua/polo |
| `rec_138` | **FUNDEC Unidade Pantanal** | Pantanal | 2 | `(-22.79576, -43.30199)` | `(-22.69967, -43.28533)` | ⚠️ **10.82 km** | Divergência de rua/polo |
| `rec_91` | **UBS Barão do Amapá** | Amapá | 4 | `(-22.68735, -43.35286)` | `(-22.60325, -43.30040)` | ⚠️ **10.79 km** | Divergência de rua/polo |

---

## 🔍 3. Casos Emblemáticos Confirmados

1. **UBS Nair Borges Fernandes (`rec_106`):**
   * Coordenada Google: `(-22.68077, -43.28670)` em Chácaras Rio-Petrópolis (esq. Washington Luíz).
   * Coordenada Antiga Banco: `(-22.73630, -43.26811)` no extremo sul de Figueira.
   * **Diferença:** 6,46 km! Confirmado erro no banco antigo.

2. **E.M. Imaculada Conceição (`rec_esc_118`):**
   * Coordenada Google: `(-22.67951, -43.28816)` em Chácaras Rio-Petrópolis.
   * Coordenada Antiga Banco: `(-22.73630, -43.26852)` no extremo sul de Figueira.
   * **Diferença:** 6,63 km! Confirmado erro no banco antigo.

3. **CAPS Imbariê (`rec_50`):**
   * Coordenada Antiga Banco: `(-22.63629, -43.28362)` colocada em Santa Cruz da Serra por causa de "Rua Projetada".
   * **Diferença:** 3,80 km a oeste do polo de Imbariê.

4. **UBS Abdul Nasser Haikal (`rec_90`):**
   * Coordenada Antiga Banco: `(-22.68336, -43.28273)` em Jardim Primavera.
   * Coordenada Real: Parque Bom Retiro (Rua Maturim).
   * **Diferença:** 3,36 km!
