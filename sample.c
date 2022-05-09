#include <stdio.h>

void flush(void);

int main(void){
    int a = 27;
    printf("%d",a);fflush(stdout);
    printf("%d",a+1);fflush(stdout);
    printf("%d",a+2);fflush(stdout);
    return 0;
}