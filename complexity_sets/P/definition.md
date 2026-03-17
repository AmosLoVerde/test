### Descrizione intuitiva
<br>
La <b>classe $P$</b> contiene i problemi decisionali che possono essere risolti da un algoritmo deterministico in tempo polinomiale rispetto alla lunghezza dell'input.
In teoria della complessità $P$ è il modello matematico standard della trattabilità: il costo cresce al più come una potenza fissa della dimensione dell'istanza, e non esplode come nelle tipiche crescite esponenziali. Questa interpretazione non significa che ogni problema in $P$ sia automaticamente pratico in ogni contesto, ma che appartiene alla nozione teorica canonica di problema efficientemente risolvibile.

<hr style="margin: 2rem 0;">

### Descrizione formale

<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [1]">
$$P = \lbrace A\text{ | } \exists c>0\text{, }\exists \text{ algoritmo deterministico }M_A \text{ che decide } A \text{ in tempo } O(|x|^c) \rbrace$$
</div>
dove:

* $A$ è un <b>problema decisionale</b>, cioè una funzione $A : I(A) \to \lbrace \text{yes, no}\rbrace$; per convenzione $\text{yes} = 1$, $\text{no} = 0$.
* $I(A)$ è l'<b>insieme delle istanze</b> ammissibili del problema $A$.
* $x$ è una generica <b>istanza di input</b>, $x\in I(A)$.
* $|x|$ è la <b>lunghezza della codifica</b> dell'istanza $x$, anche detta la sua <b>taglia</b>.
* $M_A$ è un <b>algoritmo deterministico</b> che decide $A$, cioè termina sempre su ogni input $x$ e restituisce la risposta corretta.
<br>
Dire che $M_A$ lavora in tempo $O(|x|^c)$ significa che esiste una costante $c>0$ tale che il numero di passi dell'algoritmo è limitato superiormente da una funzione polinomiale della lunghezza dell'input.
<br>
<br>
<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [2]">
$$\text{DTIME}(f(n)) = \lbrace A\text{ | } A \text{ è un problema decisionale decidibile da un algoritmo deterministico in tempo } O(f(n))\rbrace$$
</div>
Quindi:
$$
P = \bigcup_{c>0}\text{DTIME}(n^c)
$$
$P$ è l'unione, su tutte le costanti $c>0$, delle classi di problemi decidibili deterministicamente in tempo $O(n^c)$, con $n$ la lunghezza dell'input $n=|x|$.

<hr style="margin: 2rem 0;">

### Relazioni note con altre classi
<br>

* $P\subseteq \textit{NP}$

* $P\subseteq \textit{co-NP}$

* $P = \textit{co-P}$

* $P\subseteq \textit{NP} \cap \textit{co-NP}$

* $P\subseteq \textit{PSPACE}$

* $P\subseteq \textit{EXP}$

* $P \neq \textit{EXP}$


<hr style="margin: 2rem 0;">

### Relazioni ancora non note / problemi aperti
<br>

* $P \stackrel{?}{=} \textit{NP}$

* $P \stackrel{?}{=} \textit{NP} \cap \textit{co-NP}$

* $P \stackrel{?}{=} \textit{PSPACE}$

* $P \stackrel{?}{=} \textit{BPP}$

* $P \stackrel{?}{=} \textit{NC}$