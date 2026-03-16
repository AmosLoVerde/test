### Descrizione intuitiva
<br>
La <b>classe $\textit{NP} \cap \textit{co-NP}$</b> contiene i problemi decisionali per i quali entrambe le possibili risposte ammettono un certificato efficiente: quando la risposta corretta è <i>yes</i>, esiste un certificato <i>yes</i> verificabile in tempo polinomiale; quando la risposta corretta è <i>no</i>, esiste un certificato <i>no</i> verificabile in tempo polinomiale.
Quindi $\textit{NP} \cap \textit{co-NP}$ contiene i problemi per cui sia le istanze positive sono verificabili efficientemente sia le istanze negative.
Quindi per ogni istanza esiste sempre una prova breve e controllabile efficientemente della risposta corretta, anche se la natura del certificato può essere molto diversa nei due casi.

<hr style="margin: 2rem 0;">

### Descrizione formale

<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [1]">
$$\textit{NP} \cap \textit{co-NP} = \lbrace A\text{ | } \exists c>0\text{, }\exists \text{ algoritmi deterministici }V_{yes},V_{no}\text{ tali che }x\in A \iff \exists y\in\lbrace 0,1\rbrace^{|x|^c}\text{ con }V_{yes}(x,y)=1\text{ in tempo }O(|x|^c),$$
$$x\notin A \iff \exists z\in\lbrace 0,1\rbrace^{|x|^c}\text{ con }V_{no}(x,z)=1\text{ in tempo }O(|x|^c) \rbrace$$
</div>

* $A$ è un <b>problema decisionale</b>, cioè una funzione $A : I(A) \to \lbrace \text{yes, no}\rbrace$; per convenzione $\text{yes} = 1$, $\text{no} = 0$.
* $I(A)$ è l'<b>insieme delle istanze</b> ammissibili del problema $A$.
* $x$ è una generica <b>istanza di input</b>, $x\in I(A)$.
* $|x|$ è la <b>lunghezza della codifica</b> dell'istanza $x$, anche detta la sua <b>taglia</b>.
* $y$ è un <b>certificato yes</b> per l'istanza $x$, di lunghezza limitata superiormente da un polinomio in $|x|$.
* $z$ è un <b>certificato no</b> per l'istanza $x$, di lunghezza limitata superiormente da un polinomio in $|x|$.
* $V_{yes}$ è un algoritmo deterministico detto <b>verificatore yes</b>, che riceve in input la coppia $(x,y)$ e controlla in tempo polinomiale che $y$ certifichi correttamente $x\in A$.
* $V_{no}$ è un algoritmo deterministico detto <b>verificatore no</b>, che riceve in input la coppia $(x,z)$ e controlla in tempo polinomiale che $z$ certifichi correttamente $x\notin A$.
<br>
Dire che i verificatori lavorano in tempo $O(|x|^c)$ significa che esiste una costante $c>0$ tale che il numero di passi di ciascun verificatore è limitato superiormente da una funzione polinomiale della lunghezza dell'istanza. Poiché la verifica avviene in tempo polinomiale rispetto a $|x|$, allora anche la porzione dei certificati effettivamente letta è di lunghezza polinomiale.
<br>
<br>
<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [2]">
$$\textit{NP} \cap \textit{co-NP} = \lbrace A\text{ | } A\in \textit{NP}\wedge A\in \textit{co-NP}\rbrace = \lbrace A\text{ | } A\in \textit{NP}\wedge\overline{A}\in \textit{NP}\rbrace$$
</div>
Equivalentemente, un linguaggio appartiene a $\textit{NP} \cap \textit{co-NP}$ se e solo se ammette sia certificati polinomialmente brevi per le istanze positive, sia certificati polinomialmente brevi per le istanze negative.
In forma quantificazionale: un linguaggio $A$ appartiene a $\textit{NP} \cap \textit{co-NP}$ se e solo se esistono un polinomio $p$ e predicati polinomialmente decidibili $R_{yes},R_{no}$ tali che:
$$
\begin{align*}
x\in A &\iff \exists y\in\lbrace 0,1\rbrace^{\le p(|x|)}\; R_{yes}(x,y)\\
x\notin A &\iff \exists z\in\lbrace 0,1\rbrace^{\le p(|x|)}\; R_{no}(x,z).
\end{align*}
$$

<hr style="margin: 2rem 0;">

### Relazioni note con altre classi
<br>

* $P\subseteq \textit{NP} \cap \textit{co-NP}$

* $\textit{NP} \cap \textit{co-NP} \subseteq \textit{NP}$

* $\textit{NP} \cap \textit{co-NP} \subseteq \textit{co-NP}$

* $\textit{NP} \cap \textit{co-NP} \subseteq \textit{PSPACE}$

* $\textit{NP} \cap \textit{co-NP} \subseteq \textit{EXP}$

* $\textit{NP} \cap \textit{co-NP} \subseteq \textit{NEXP}$

* Se $A\in \textit{NP} \cap \textit{co-NP}$, allora anche $\overline{A}\in \textit{NP} \cap \textit{co-NP}$


<hr style="margin: 2rem 0;">

### Relazioni ancora non note / problemi aperti
<br>

* $P \stackrel{?}{=} \textit{NP} \cap \textit{co-NP}$

* $\textit{NP} \cap \textit{co-NP} \stackrel{?}{=} \textit{NP}$

* $\textit{NP} \cap \textit{co-NP} \stackrel{?}{=} \textit{co-NP}$

* Se un problema $\textit{NP-complete}$ appartenesse a $\textit{NP} \cap \textit{co-NP}$, allora seguirebbe $\textit{NP}=\textit{co-NP}$

* Esiste un problema naturale in $\textit{NP} \cap \textit{co-NP}$ che non appartenga a $P$?

