### Descrizione intuitiva
<br>
La <b>classe $\textit{NP}$</b> contiene i problemi decisionali per i quali, quando la risposta corretta è <i>yes</i>, esiste una prova finita della positività dell'istanza (certificato <i>yes</i>) che può essere controllata in tempo polinomiale rispetto alla lunghezza dell'input.
Quindi $\textit{NP}$ raccoglie i problemi per cui trovare una soluzione può essere difficile, ma verificarne il certificato è efficiente. Più precisamente, per ogni istanza positiva esiste un certificato di lunghezza polinomiale che consente a un verificatore deterministico di accertare in tempo polinomiale che l'istanza appartiene al linguaggio.

<hr style="margin: 2rem 0;">

### Descrizione formale

<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [1]">
$$\textit{NP} = \lbrace \mathbb{A}\text{ | } \exists c\geq 0\text{, }\exists B(\cdot,\cdot)\text{ tale che }x\in A \iff \exists y\in\lbrace 0,1\rbrace^{|x|^c}\text{, con }B(x,y)=1\text{ in tempo }O(|x|^c) \rbrace$$
</div>
dove:

* $\mathbb{A}$ è un <b>problema decisionale</b>, cioè una funzione $\mathbb{A} : I(\mathbb{A}) \to \lbrace \text{yes, no}\rbrace$; per convenzione $\text{yes} = 1$, $\text{no} = 0$.
* $I(\mathbb{A})$ è l'<b>insieme delle istanze</b> ammissibili del problema $\mathbb{A}$.
* $x$ è una generica <b>istanza di input</b>, $x\in I(\mathbb{A})$.
* $|x|$ è la <b>lunghezza della codifica</b> dell'istanza $x$, anche detta la sua <b>taglia</b>.
* $y$ è un <b>certificato</b> per l'istanza $x$, di lunghezza limitata superiormente da un polinomio in $|x|$.
* $B(\cdot,\cdot)$ è un algoritmo deterministico, detto <b>verificatore</b>, che riceve in input la coppia $(x,y)$ e controlla in tempo polinomiale se $y$ certifica correttamente che $x$ è una istanza corretta/positiva di $\mathbb{A}$.
<br>
Dire che $B$ lavora in tempo $O(|x|^c)$ significa che esiste una costante $c\geq 0$ tale che il numero di passi del verificatore è limitato superiormente da una funzione polinomiale della lunghezza dell'istanza. Poiché il verificatore opera in tempo polinomiale rispetto a $|x|$, anche la porzione del certificato effettivamente letta è di lunghezza polinomiale.
<br>
<br>
<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [2]">
$$\text{NTIME}(f(n)) = \lbrace \mathbb{A}\text{ | } \mathbb{A} \text{ è un problema decisionale decidibile da una macchina di Turing non deterministica in tempo } O(f(n))\rbrace$$
</div>
Quindi:
$$
\textit{NP} = \bigcup_{c\geq 0}\text{NTIME}(n^c)
$$
$\textit{NP}$ è l'unione, su tutte le costanti $c\geq 0$, delle classi di problemi decidibili da una macchina di Turing non deterministica in tempo $O(n^c)$, con $n$ la lunghezza dell'input $n=|x|$. In modo equivalente: un linguaggio appartiene a $\textit{NP}$ se e solo se ammette certificati polinomialmente brevi verificabili deterministicamente in tempo polinomiale.

<hr style="margin: 2rem 0;">

### Relazioni note con altre classi
<br>

* $P\subseteq \textit{NP}$

* $\textit{NP}\subseteq \textit{PSPACE}$

* $\textit{NP}\subseteq \textit{EXP}$

* $\textit{NP}\subseteq \textit{NEXP}$

* $\textit{NP} \cap \textit{co-NP} \subseteq \textit{NP}$

* $\textit{NP-complete}\subseteq \textit{NP}$


<hr style="margin: 2rem 0;">

### Relazioni ancora non note / problemi aperti
<br>

* $P \stackrel{?}{=} \textit{NP}$

* $\textit{NP} \stackrel{?}{=} \textit{co-NP}$

* $\textit{NP} \stackrel{?}{=} \textit{PSPACE}$

* $\textit{NP} \stackrel{?}{=} \textit{EXP}$

* Esistono problemi in $\textit{NP}$ che non appartengono né a $P$ né alla classe dei problemi $\textit{NP-complete}? La risposta è sì per il teorema di Ladner, tuttavia nessun problema naturale universalmente accettato è noto essere tale.
