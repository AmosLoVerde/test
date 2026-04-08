### Domanda del problema
<br>

$\rhd$ Data una formula booleana $k$-CNF $\varphi$, esiste un assegnamento dei valori alle variabili di $\varphi$ tale che la formula risulti vera?

<br>
<u>Formula booleana $k$-CNF</u>: ogni clausola contiene al massimo $k$ letterali.
$$\begin{align*}
\varphi &= C^1 \wedge C^2 \wedge \dots \wedge C^m\\
C^i &= l^i_1 \vee l^i_2 \vee \dots \vee l^i_k
\end{align*}$$

<hr style="margin: 2rem 0;">

### Definizione formale
<br>

<u>Input</u>: formula booleana $k$-CNF $\varphi$.

<br>

<u>Output</u>: risponde sì se e solo se esiste un assegnamento $a$ tale che se applicata alla formula $\varphi$ questa risulti vera.

$$
\text{Sì} \\,\\, \Leftrightarrow \\,\\, \exists a:\lbrace x_1,\dots,x_n\rbrace \rightarrow \lbrace T, F\rbrace \\,.\\, \varphi(a) = T
$$

Altrimenti risponde no.

<hr style="margin: 2rem 0;">

* 1-SAT e 2-SAT appartengono alla classe P.
* Per ogni $k\geq 3$, $k$-SAT appartiene alla classe NP-completi.