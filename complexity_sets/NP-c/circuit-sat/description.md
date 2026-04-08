### Domanda del problema
<br>
$\rhd$ Dato un circuito booleano $C$, esiste un assegnamento $x\in \{0,1\}^n$ dei valori agli input di $C$ tale che il circuito produca output 1?
<br><br>
<u>Circuito booleano</u>: è un grafo diretto aciclico (DAG) con:

* $n$ nodi di input (<b>sorgenti</b>) con grado 0 in entrata;
* tutti i nodi interni hanno grado in entrata 1 oppure 2, e grado 1 di uscita. Sono etichettati con porte logiche:
    * AND, OR (grado 2 in entrata)
    * NOT (grado 1 in entrata)
* un nodo di output (<b>pozzo</b>) di grado 0 in uscita.

<hr style="margin: 2rem 0;">

### Definizione formale
<br>
<u>Input</u>: circuito booleano aciclico $C$, con:

* $n$ nodi di input, associati a variabili booleane $x_1,\dots,x_n\in \lbrace 0,1 \rbrace$;
* un insieme finito di nodi interni che rappresentano le porte logiche AND, OR, NOT;
* un unico nodo di output.
$$ C : \lbrace 0,1 \rbrace^n \rightarrow \lbrace 0,1\rbrace$$

<br>

<u>Output</u>: risponde sì se e solo se esiste un'assegnamento per tutti gli input tale che il circuito restituisca 1.
$$ \text{Sì}\\,\\, \Leftrightarrow \\,\\,\exists x\in \lbrace 0,1 \rbrace^n \\,.\\, C(x) = 1$$
Altrimenti risponde no.
