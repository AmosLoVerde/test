### Descrizione intuitiva
<br>
La <b>famiglia dei problemi $\textit{co-NP-hard}$</b> raccoglie i problemi decisionali che sono almeno difficili quanto tutti i problemi appartenenti a $\textit{co-NP}$, rispetto a riduzioni polinomiali di tipo many-one (Karp). In termini intuitivi, un problema è $\textit{co-NP-hard}$ quando qualunque problema di $\textit{co-NP}$ può essere trasformato in tempo polinomiale in una sua istanza, in modo che la risposta venga preservata.
<br>
Questa nozione esprime una <b>durezza per riduzione</b>, non una semplice appartenenza semantica a una classe come $P$, $\textit{NP}$ o $\textit{co-NP}$. Di conseguenza, dire che un problema è $\textit{co-NP-hard}$ non significa affermare che esso appartenga a $\textit{co-NP}$: significa soltanto che esso è almeno tanto difficile quanto i problemi di $\textit{co-NP}$. In particolare, un problema $\textit{co-NP-hard}$ può appartenere a $\textit{co-NP}$, ma può anche stare fuori da $\textit{co-NP}$, e in linea di principio può persino essere indecidibile.
<br>
Dal punto di vista concettuale, poiché $\textit{co-NP}$ contiene i problemi per cui le istanze negative ammettono certificati polinomiali verificabili efficientemente, un problema $\textit{co-NP-hard}$ rappresenta un livello di difficoltà almeno pari a quello richiesto per risolvere tutti tali problemi. I problemi $\textit{co-NP-complete}$ sono precisamente i problemi che, oltre a essere $\textit{co-NP-hard}$, appartengono anche a $\textit{co-NP}$; essi costituiscono quindi gli esempi canonici e più naturali di durezza per $\textit{co-NP}$.
<br>
Esempi classici in letteratura di problemi $\textit{co-NP-complete}$, e dunque anche $\textit{co-NP-hard}$, sono <i>TAUTOLOGY</i> / <i>VALIDITY</i>, il problema <i>UNSAT</i> e il complemento di problemi NP-completi canonici come <i>HAMILTON PATH</i>. In letteratura si incontrano inoltre anche problemi $\textit{co-NP-hard}$ che non sono noti o non sono veri membri di $\textit{co-NP}$.

<hr style="margin: 2rem 0;">

### Descrizione formale

<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [1]">
$$\textit{co-NP-hard} = \lbrace A\text{ | } A \text{ è un problema decisionale e } \forall B\in \textit{co-NP}\text{ si ha } B\leq_p A \rbrace$$
</div>
dove:

* $A$ è un <b>problema decisionale</b>, cioè una funzione $A : I(A) \to \lbrace \text{yes, no}\rbrace$; per convenzione $\text{yes} = 1$, $\text{no} = 0$.
* $I(A)$ è l'<b>insieme delle istanze</b> ammissibili del problema $A$.
* $B$ è un generico problema decisionale appartenente alla classe $\textit{co-NP}$.
* $B\leq_p A$ significa che esiste una <b>riduzione polinomiale many-one</b> da $B$ ad $A$, cioè una funzione $f:\{0,1\}^*\to\{0,1\}^*$ calcolabile in tempo polinomiale tale che, per ogni istanza $x$, vale
$$
x\in B \iff f(x)\in A.
$$
<br>
La definizione afferma quindi che $A$ è $\textit{co-NP-hard}$ se ogni linguaggio in $\textit{co-NP}$ può essere tradotto efficientemente in un'istanza di $A$. In altri termini, un algoritmo polinomiale per $A$ implicherebbe, per composizione con le riduzioni, un algoritmo polinomiale per ogni problema di $\textit{co-NP}$.
<br>
<br>
<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [2]">
$$\textit{co-NP-complete} = \textit{co-NP} \cap \textit{co-NP-hard}$$
</div>
Quindi un problema è <b>$\textit{co-NP-complete}$</b> se e solo se soddisfa simultaneamente due condizioni:

* appartiene a $\textit{co-NP}$;
* è $\textit{co-NP-hard}$.

Ne segue che la completezza per $\textit{co-NP}$ è la nozione che individua i problemi più difficili <i>interni</i> alla classe $\textit{co-NP}$, mentre la sola durezza $\textit{co-NP-hard}$ consente anche problemi esterni alla classe.
<br>
<br>
<div class="definition-box" style="--box-color: #7c3aed;" data-title="Definizione [3]">
$$\textit{co-NP} = \lbrace L\text{ | } \overline{L}\in \textit{NP}\rbrace$$
</div>
Equivalentemente, un linguaggio $L$ appartiene a $\textit{co-NP}$ se e solo se esistono un polinomio $p$ e una macchina deterministica in tempo polinomiale $M$ tali che
$$
x\in L \iff \forall u\in\lbrace 0,1\rbrace^{p(|x|)}\; M(x,u)=1.
$$
Questa caratterizzazione mette in evidenza la natura universale di $\textit{co-NP}$: l'appartenenza di un'istanza a $L$ equivale al fatto che <i>tutti</i> i certificati di lunghezza polinomiale soddisfino una certa verifica polinomiale. La durezza $\textit{co-NP-hard}$ misura quindi la difficoltà di problemi almeno tanto complessi quanto l'intera classe così definita.
<br>
<br>
Problemi canonici noti in letteratura che sono $\textit{co-NP-hard}$ sono, in particolare:

* <b>TAUTOLOGY / VALIDITY</b>: dato una formula booleana $\varphi$, stabilire se $\varphi$ è vera per ogni assegnamento;
* <b>UNSAT</b>: dato una formula booleana, stabilire se essa è insoddisfacibile;
* <b>HAMILTON PATH COMPLEMENT</b>: dato un grafo, stabilire se esso non possiede alcun cammino hamiltoniano.

Tutti questi esempi sono in realtà $\textit{co-NP-complete}$, quindi appartengono a $\textit{co-NP}$ oltre a essere $\textit{co-NP-hard}$.

<hr style="margin: 2rem 0;">

### Relazioni note con altre classi
<br>

* $\textit{co-NP-complete}\subseteq \textit{co-NP-hard}$

* $\textit{co-NP}\cap \textit{co-NP-hard}=\textit{co-NP-complete}$

* $\textit{co-NP-complete}\subseteq \textit{co-NP}$

* Se $L$ è $\textit{NP-complete}$, allora il complemento $\overline{L}$ è $\textit{co-NP-complete}$, e dunque $\overline{L}\in \textit{co-NP-hard}$

* $\textit{co-NP-hard}$ non è noto essere contenuto in $\textit{co-NP}$

* $\textit{co-NP-hard}$ non è noto essere contenuto in $\textit{PSPACE}$

* $\textit{co-NP-hard}$ non è noto essere contenuto in $\textit{EXP}$

* $\textit{co-NP-hard}$ può contenere problemi non appartenenti a $\textit{co-NP}$

* $\textit{co-NP-hard}$ può contenere problemi indecidibili

* Se un problema $A$ è $\textit{co-NP-hard}$ e inoltre $A\in \textit{co-NP}$, allora $A$ è $\textit{co-NP-complete}$

* Se un problema $A$ è $\textit{co-NP-hard}$ e inoltre $A\in \textit{NP}$, allora $\textit{NP}=\textit{co-NP}$

* Se $P=\textit{NP}$, allora $P=\textit{NP}=\textit{co-NP}$; in tal caso i problemi $\textit{NP-hard}$ e $\textit{co-NP-hard}$ coincidono rispetto alle usuali riduzioni polinomiali


<hr style="margin: 2rem 0;">

### Relazioni ancora non note / problemi aperti
<br>

* $\textit{NP} \stackrel{?}{=} \textit{co-NP}$

* Esiste un problema naturale che sia $\textit{co-NP-hard}$ ma non $\textit{co-NP-complete}$ e al tempo stesso decidibile?

* Esistono problemi naturali $\textit{co-NP-hard}$ strettamente esterni sia a $\textit{co-NP}$ sia a $\textit{NP}$, la cui collocazione precisa sia universalmente accettata?

* Esiste un problema naturale in $\textit{NP}\cap\textit{co-NP}$ che sia $\textit{co-NP-hard}$? Se esistesse, allora seguirebbe $\textit{NP}=\textit{co-NP}$

* $\textit{co-NP-hard} \stackrel{?}{=} \textit{NP-hard}$

* $\textit{co-NP-hard}\cap \textit{co-NP} \stackrel{?}{=} \textit{co-NP}$

* È noto che l'uguaglianza precedente varrebbe se e solo se ogni problema di $\textit{co-NP}$ fosse $\textit{co-NP-hard}$; in generale ciò non è ritenuto plausibile e non è supportato dalla teoria della completezza, ma non esiste alcuna caratterizzazione strutturale semplice dell'intera famiglia dei problemi $\textit{co-NP-hard}$

* Poiché $\textit{co-NP-hard}$ è una nozione di durezza e non una classe semantica di decidibilità, resta aperta una comprensione strutturale fine dei problemi naturali che siano $\textit{co-NP-hard}$ senza essere completi per $\textit{co-NP}$
