### Descrizione intuitiva
<br>
La <b>classe $\textit{co-NP}$</b> contiene i problemi decisionali per i quali, quando la risposta corretta è <i>no</i>, esiste una prova finita della negatività dell'istanza (certificato <i>no</i>) che può essere controllata in tempo polinomiale rispetto alla lunghezza dell'input. In particolare $\textit{co-NP}$ è la classe dei complementi dei problemi in $\textit{NP}$: un linguaggio appartiene a $\textit{co-NP}$ se e solo se il suo complemento appartiene a $\textit{NP}$.

<hr style="margin: 2rem 0;">

### Descrizione formale

<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [1]">
$$\textit{co-NP} = \lbrace A\text{ | } \overline{A}\in NP \rbrace$$
</div>
dove $\overline{A}$ denota il <b>complemento</b> del linguaggio/problema decisionale $A$, cioè l'insieme delle istanze per cui $A$ risponde $\textit{no}$. Equivalentemente, un problema decisionale $A$ appartiene a $\textit{co-NP}$ se esistono una costante $c>0$ e un algoritmo deterministico $V_A$ tali che:
$$
x\in A \iff \forall y\in\lbrace 0,1\rbrace^{|x|^c}\text{ si ha }V_A(x,y)=1\text{ in tempo }O(|x|^c)
$$
Questa formulazione mette in evidenza il quantificatore universale caratteristico di $\textit{co-NP}$: un'istanza $x$ appartiene ad $A$ se e solo se ogni stringa candidata $y$ di lunghezza polinomiale supera il controllo del verificatore. In modo del tutto equivalente, si può leggere la definizione dicendo che, se $x\notin A$, allora esiste almeno un certificato $y$ di lunghezza polinomiale che funge da controesempio e consente al verificatore di rigettare l'appartenenza di $x$ ad $A$ in tempo polinomiale.

* $A$ è un <b>problema decisionale</b>, cioè una funzione $A : I(A) \to \lbrace \text{yes, no}\rbrace$; per convenzione $\text{yes} = 1$, $\text{no} = 0$.
* $I(A)$ è l'<b>insieme delle istanze</b> ammissibili del problema $A$.
* $\overline{A}$ è il <b>complemento</b> di $A$, cioè il problema che risponde $\textit{yes}$ esattamente sulle istanze su cui $A$ risponde $\textit{no}$.
* $x$ è una generica <b>istanza di input</b>, $x\in I(A)$.
* $|x|$ è la <b>lunghezza della codifica</b> dell'istanza $x$, anche detta la sua <b>taglia</b>.
* $y$ è una <b>stringa candidata</b> di lunghezza limitata superiormente da un polinomio in $|x|$; nella lettura certificativa di $\textit{co-NP}$, quando $x\notin A$, una scelta appropriata di $y$ può fungere da <b>certificato di non appartenenza</b>.
* $V_A$ è un <b>algoritmo deterministico</b> che riceve in input la coppia $(x,y)$ e lavora in tempo polinomiale; nella formulazione con quantificatore universale esso deve accettare tutte le stringhe $y$ quando $x\in A$, mentre se $x\notin A$ almeno una stringa $y$ deve far fallire il controllo.
<br>
Dire che $V_A$ lavora in tempo $O(|x|^c)$ significa che esiste una costante $c>0$ tale che il numero di passi del verificatore è limitato superiormente da una funzione polinomiale della lunghezza dell'istanza. Poiché il verificatore opera in tempo polinomiale rispetto a $|x|$, anche la porzione della stringa candidata effettivamente letta è di lunghezza polinomiale.
<br>
<br>
<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [2]">
$$\text{co-NTIME}(f(n)) = \lbrace A\text{ | } A \text{ è un problema decisionale il cui complemento è decidibile da una macchina di Turing non deterministica in tempo } O(f(n))\rbrace$$
</div>
Quindi:
$$
\textit{co-NP} = \bigcup_{c>0}\text{co-NTIME}(n^c)
$$
$\textit{co-NP}$ è l'unione, su tutte le costanti $c>0$, delle classi di problemi i cui complementi sono decidibili da una macchina di Turing non deterministica in tempo $O(n^c)$, con $n$ la lunghezza dell'input $n=|x|$. In modo equivalente: un linguaggio appartiene a $\textit{co-NP}$ se e solo se è il complemento di un linguaggio in $NP$, oppure se e solo se le sue istanze negative ammettono certificati polinomialmente brevi verificabili deterministicamente in tempo polinomiale.

<hr style="margin: 2rem 0;">

### Relazioni note con altre classi
<br>

* $P\subseteq co\text{-}\textit{NP}$

* $co\text{-}\textit{NP}\subseteq \textit{PSPACE}$

* $co\text{-}\textit{NP}\subseteq \textit{EXP}$

* $co\text{-}\textit{NP}\subseteq \textit{NEXP}$

* $\textit{NP} \cap co\text{-}\textit{NP} \subseteq co\text{-}\textit{NP}$

* $co\text{-}\textit{NP-complete}\subseteq co\text{-}\textit{NP}$


<hr style="margin: 2rem 0;">

### Relazioni ancora non note / problemi aperti
<br>

* $P \stackrel{?}{=} co\text{-}\textit{NP}$

* $\textit{NP} \stackrel{?}{=} co\text{-}\textit{NP}$

* $co\text{-}\textit{NP} \stackrel{?}{=} \textit{PSPACE}$

* $co\text{-}\textit{NP} \stackrel{?}{=} \textit{EXP}$

* Esistono problemi in $co\text{-}\textit{NP}$ che non appartengono né a $P$ né alla classe dei problemi $\textit{co-NP-complete}$? Se $P\neq NP$ (equivalentemente, se $P\neq \textit{co-NP}$), allora per il teorema di Ladner applicato via complementarità esistono linguaggi di questo tipo, tuttavia nessun problema naturale universalmente accettato è noto essere tale.
