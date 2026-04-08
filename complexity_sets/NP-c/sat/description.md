### Domanda del problema
<br>

$\rhd$ Data una formula booleana CNF $\varphi$, esiste un assegnamento dei valori alle variabili di $\varphi$ tale che la formula risulti vera?

<br>
<u>Formula booleana CNF</u>:
$$\varphi = C^1 \wedge C^2 \wedge \dots \wedge C^m$$
dove ogni clausola $C^i$ è di lunghezza variabile e della forma:
$$ C^i = l^i_1 \vee l^i_2 \vee \dots \vee l^i_n$$
e ciascun $l^i_j$ è una variabile booleana $x$ o la sua negazione $\neg x$.

<hr style="margin: 2rem 0;">

### Definizione formale
<br>

<u>Input</u>: formula booleana CNF $\varphi$.

<br>

<u>Output</u>: risponde sì se e solo se esiste un assegnamento $a$ tale che se applicata alla formula $\varphi$ questa risulti vera.

$$
\text{Sì} \\,\\, \Leftrightarrow \\,\\, \exists a:\lbrace x_1,\dots,x_n\rbrace \rightarrow \lbrace T, F\rbrace \\,.\\, \varphi(a) = T
$$

Altrimenti risponde no.
